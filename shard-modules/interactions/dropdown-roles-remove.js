const { StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

module.exports = {
    name: `dropdown-roles-remove`,
    run: async (client, interaction) => {
        // Get the dropdown configuration from the database
        const dropdownDB = await client.dropdownRoleSchema.findOne({ 
            guildID: interaction.guildId, 
            messageID: interaction.message.id 
        }).lean()
        
        // Get all role IDs from the select menu options
        const selectMenuComponent = interaction.message.components[0]?.components[0]
        if (!selectMenuComponent || selectMenuComponent.type !== 3) { // 3 = StringSelect
            return interaction.reply({ 
                content: `${client.config.emojis.NO}**${client.language({ textId: "Failed to find role menu", guildId: interaction.guildId, locale: interaction.locale })}**`, 
                flags: ["Ephemeral"] 
            })
        }
        
        const dropdownRoleIds = selectMenuComponent.options.map(opt => opt.value)
        
        // Find which dropdown roles the user currently has
        const userDropdownRoles = []
        for (const roleId of dropdownRoleIds) {
            if (interaction.member.roles.cache.has(roleId)) {
                const guildRole = await interaction.guild.roles.fetch(roleId).catch(() => null)
                if (guildRole) {
                    // Find the option to get the label
                    const option = selectMenuComponent.options.find(opt => opt.value === roleId)
                    userDropdownRoles.push({
                        id: roleId,
                        name: guildRole.name,
                        label: option?.label || guildRole.name,
                        emoji: option?.emoji
                    })
                }
            }
        }
        
        // User has no roles from this dropdown
        if (userDropdownRoles.length === 0) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO}**${client.language({ textId: "You don't have roles from this menu", guildId: interaction.guildId, locale: interaction.locale })}**`, 
                flags: ["Ephemeral"] 
            })
        }
        
        // User has only one role - show confirmation
        if (userDropdownRoles.length === 1) {
            const role = userDropdownRoles[0]
            const confirmButton = new ButtonBuilder()
                .setLabel(client.language({ textId: "Yes, remove", guildId: interaction.guildId, locale: interaction.locale }))
                .setStyle(ButtonStyle.Danger)
                .setCustomId(`dropdown-remove-confirm_${role.id}_${interaction.id}`)
            const cancelButton = new ButtonBuilder()
                .setLabel(client.language({ textId: "Cancel", guildId: interaction.guildId, locale: interaction.locale }))
                .setStyle(ButtonStyle.Secondary)
                .setCustomId(`dropdown-remove-cancel_${interaction.id}`)
            
            const row = new ActionRowBuilder().addComponents([confirmButton, cancelButton])
            
            await interaction.reply({ 
                content: `${client.language({ textId: "Are you sure you want to remove role", guildId: interaction.guildId, locale: interaction.locale })} <@&${role.id}>?`, 
                components: [row],
                flags: ["Ephemeral"] 
            })
            
            // Wait for button interaction
            const filter = (i) => (i.customId === `dropdown-remove-confirm_${role.id}_${interaction.id}` || i.customId === `dropdown-remove-cancel_${interaction.id}`) && i.user.id === interaction.user.id
            const buttonInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(() => null)
            
            if (!buttonInteraction) {
                return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Timeout expired", guildId: interaction.guildId, locale: interaction.locale })}**`, components: [] })
            }
            
            if (buttonInteraction.customId.startsWith('dropdown-remove-cancel')) {
                return buttonInteraction.update({ content: `${client.language({ textId: "Cancelled", guildId: interaction.guildId, locale: interaction.locale })}`, components: [] })
            }
            
            // Confirm - remove the role
            const guildRole = await interaction.guild.roles.fetch(role.id).catch(() => null)
            if (!guildRole) {
                return buttonInteraction.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role no longer exists", guildId: interaction.guildId, locale: interaction.locale })}**`, components: [] })
            }
            
            if (!interaction.guild.members.me.permissions.has("ManageRoles") || guildRole.position >= interaction.guild.members.me.roles.highest.position) {
                return buttonInteraction.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to remove role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${role.id}>`, components: [] })
            }
            
            await interaction.member.roles.remove(role.id).catch(e => {
                return buttonInteraction.update({ content: `${client.config.emojis.NO}**${client.language({ textId: "Failed to remove role", guildId: interaction.guildId, locale: interaction.locale })}:** ${e.message}`, components: [] })
            })
            
            // Cancel timed role if exists
            const { cancelTimedRole } = require('../modules/timedRoles')
            await cancelTimedRole(client, interaction.guildId, interaction.user.id, role.id)
            
            return buttonInteraction.update({ content: `${client.config.emojis.YES}**${client.language({ textId: "Role removed", guildId: interaction.guildId, locale: interaction.locale })}:** <@&${role.id}>`, components: [] })
        }
        
        // User has multiple roles - show select menu
        const roleOptions = userDropdownRoles.map(role => ({
            label: role.label,
            value: role.id,
            emoji: role.emoji || undefined
        }))
        
        const removeSelectMenu = new StringSelectMenuBuilder()
            .setOptions(roleOptions)
            .setPlaceholder(client.language({ textId: "Select role to remove", guildId: interaction.guildId, locale: interaction.locale }))
            .setCustomId(`dropdown-remove-select_${interaction.id}`)
            .setMaxValues(roleOptions.length)
        
        const row = new ActionRowBuilder().addComponents([removeSelectMenu])
        
        await interaction.reply({ 
            content: `${client.language({ textId: "Select roles you want to remove", guildId: interaction.guildId, locale: interaction.locale })}:`, 
            components: [row],
            flags: ["Ephemeral"] 
        })
        
        // Wait for select menu interaction
        const filter = (i) => i.customId === `dropdown-remove-select_${interaction.id}` && i.user.id === interaction.user.id
        const selectInteraction = await interaction.channel.awaitMessageComponent({ filter, time: 30000 }).catch(() => null)
        
        if (!selectInteraction) {
            return interaction.editReply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Timeout expired", guildId: interaction.guildId, locale: interaction.locale })}**`, components: [] })
        }
        
        const selectedRoleIds = selectInteraction.values
        const removedRoles = []
        const failedRoles = []
        
        for (const roleId of selectedRoleIds) {
            const guildRole = await interaction.guild.roles.fetch(roleId).catch(() => null)
            if (!guildRole) {
                failedRoles.push({ id: roleId, reason: client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale }) })
                continue
            }
            
            if (!interaction.guild.members.me.permissions.has("ManageRoles") || guildRole.position >= interaction.guild.members.me.roles.highest.position) {
                failedRoles.push({ id: roleId, reason: client.language({ textId: "no permission", guildId: interaction.guildId, locale: interaction.locale }) })
                continue
            }
            
            try {
                await interaction.member.roles.remove(roleId)
                removedRoles.push(roleId)
                
                // Cancel timed role if exists
                const { cancelTimedRole } = require('../modules/timedRoles')
                await cancelTimedRole(client, interaction.guildId, interaction.user.id, roleId)
            } catch (e) {
                failedRoles.push({ id: roleId, reason: e.message })
            }
        }
        
        let responseContent = ''
        if (removedRoles.length > 0) {
            responseContent += `${client.config.emojis.YES}**${client.language({ textId: "Roles removed", guildId: interaction.guildId, locale: interaction.locale })}:** ${removedRoles.map(id => `<@&${id}>`).join(", ")}`
        }
        if (failedRoles.length > 0) {
            if (responseContent) responseContent += '\n'
            responseContent += `${client.config.emojis.NO}**${client.language({ textId: "Failed to remove", guildId: interaction.guildId, locale: interaction.locale })}:** ${failedRoles.map(r => `<@&${r.id}> (${r.reason})`).join(", ")}`
        }
        
        return selectInteraction.update({ content: responseContent || `${client.config.emojis.NO}**${client.language({ textId: "Nothing changed", guildId: interaction.guildId, locale: interaction.locale })}**`, components: [] })
    }
}
