const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, GuildMember, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, Collection, RoleSelectMenuBuilder } = require("discord.js")
const MemberRegexp = /mbr{(.*?)}/
const UserRegexp = /usr{(.*?)}/
const LimitRegexp = /lim{(.*?)}/
module.exports = {
    name: 'inventory-roles',
    nameLocalizations: {
        'ru': `инвентарь-ролей`,
        'uk': `інвентар-ролей`,
        'es-ES': `inventario-de-roles`
    },
    description: 'View inventory of roles',
    descriptionLocalizations: {
        'ru': `Просмотр инвентаря ролей`,
        'uk': `Перегляд інвентарю ролей`,
        'es-ES': `Ver el inventario de roles`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': `юзер`,
                'uk': `користувач`,
                'es-ES': `usuario`
            },
            description: 'User to view inventory of roles',
            descriptionLocalizations: {
                'ru': `Просмотр инвентаря ролей пользователя`,
                'uk': `Перегляд інвентарю ролей користувача`,
                'es-ES': `Ver el inventario de roles del usuario`
            },
            type: ApplicationCommandOptionType.User,
            required: false
        }
    ],
    dmPermission: false,
    group: `inventory-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand() && UserRegexp.exec(interaction.customId)) {
            // Allow anyone to use inventory-roles from profile-menu or profile button
            const isFromProfileMenu = interaction.isStringSelectMenu() && interaction.customId.includes("profile-menu")
            const isFromProfileButton = interaction.isButton() && interaction.customId.includes("cmd{inventory-roles}")
            if (!isFromProfileMenu && !isFromProfileButton && interaction.user.id !== UserRegexp.exec(interaction.customId)[1]) return interaction.deferUpdate().catch(e => null)
        }
        const flags = []
        if (interaction.customId?.includes("eph") || interaction.values?.[0].includes("eph")) flags.push("Ephemeral")
        let member
        if (args?.user) member = await interaction.guild.members.fetch(args.user).catch(e => null)
        else if (interaction.isButton() && MemberRegexp.exec(interaction.customId)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        else if (interaction.isStringSelectMenu() && (MemberRegexp.exec(interaction.customId) || MemberRegexp.exec(interaction.values[0]))) {
            member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.values[0])?.[1]).catch(e => null)
            if (!(member instanceof GuildMember)) member = await interaction.guild.members.fetch(MemberRegexp.exec(interaction.customId)[1]).catch(e => null)
        }
        else member = interaction.member
        if (!member) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
        const settings = client.cache.settings.get(interaction.guildId)
        if (interaction.isRoleSelectMenu()) {
            const role = interaction.roles.first()
            if (!interaction.guild.members.me.permissions.has("ManageRoles") || interaction.guild.members.me.roles.highest.position <= role.position) {
                return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No permission to manage this role", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
            }
            if (interaction.customId.includes("unwear")) {
                if (!interaction.member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Such role is not worn", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                const roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id }).lean()
                if (!roleProperties || !roleProperties.canUnwear) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "This role cannot be removed", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                await interaction.member.roles.remove(role.id)
                const temporaryRole = profile.roles?.find(e => { return e.id === role.id })
                if (temporaryRole) {
                    profile.roles = profile.roles.filter(r => r.id !== temporaryRole.id)
                }
                profile.addRole(role.id, 1, temporaryRole?.until ? temporaryRole.until.getTime() - Date.now() : undefined)
                await profile.save()
            } else
            if (interaction.customId.includes("wear")) {
                const role = interaction.roles.first()
                if (!interaction.guild.members.me.permissions.has("ManageRoles") || role.position > interaction.guild.members.me.roles.highest.position) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "I don't have permission to add role", guildId: interaction.guildId, locale: interaction.locale })}** <@&${role.id}>`, flags: ["Ephemeral"] })
                }
                if (interaction.member.roles.cache.has(role.id)) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Such role is already worn", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                const inventoryRole = profile.inventoryRoles?.find(e => { return e.id === role.id })
                if (!inventoryRole || inventoryRole.amount < 1) {
                    return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "No such role in inventory", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
                }
                await interaction.member.roles.add(role.id)
                profile.subtractRole(role.id, 1, inventoryRole.ms)
                if (inventoryRole.ms) {
                    if (!profile.roles) profile.roles = []
                    profile.roles.push({ id: role.id, until: new Date(Date.now() + inventoryRole.ms) })
                }
                await profile.save()
            }
        }
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${member.displayName} | ${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, iconURL: member.displayAvatarURL() })
            .setColor(member.displayHexColor)
        if (member.user.bot || (profile.isHiden && interaction.user.id !== profile.userID && !interaction.member.permissions.has("Administrator"))) {
            embed.setDescription(`${client.config.emojis.block} ${client.language({ textId: "Profile hidden", guildId: interaction.guildId, locale: interaction.locale })}.`)
            embed.setColor(member.displayHexColor)
            return interaction.reply({ embeds: [embed] })
        }
        const description = []
        if (!profile.inventoryRoles?.length) {
            description.push(`${client.language({ textId: "No roles in inventory", guildId: interaction.guildId, locale: interaction.locale })}`)
        } else {
            profile.inventoryRoles.forEach(role => {
                description.push(`<@&${role.id}>${role.ms ? ` [${client.functions.transformSecs(client, role.ms, interaction.guildId, interaction.locale)}]` : ``} (${role.amount})`)
            })    
        }
        embed.setDescription(description.join(", "))
        let menu_options = [
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your personal profile", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your statistics", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.inventory}`, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Your inventory with items", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: `${client.config.emojis.roles}`, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your inventory with roles", guildId: interaction.guildId, locale: interaction.locale })}`, default: true },
            { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your invites", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.shop, label: `${settings.shopName ? settings.shopName.slice(0, 100) : client.language({ textId: "Shop", guildId: interaction.guildId, locale: interaction.locale }) }`, value: `usr{${interaction.user.id}}cmd{shop}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Server shop", guildId: interaction.guildId, locale: interaction.locale })}` },
            { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Your achievements", guildId: interaction.guildId, locale: interaction.locale })}`},
            { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })}` },
        ]
        if (member.user.id !== interaction.user.id) {
            menu_options = [
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Profile", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{profile}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Personal profile", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.profile, label: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{stats}mbr{${member.user.id}}`, description: `${client.language({ textId: "Statistics", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.inventory, label: `${client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory}lim{15}mbr{${member.user.id}}eph reply`, description: `${client.language({ textId: "Inventory with items", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.roles, label: `${client.language({ textId: "Role inventory", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{inventory-roles}lim{50}mbr{${member.user.id}}`, description: `${client.language({ textId: "Inventory with roles", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}`, default: true },
                { emoji: client.config.emojis.invite, label: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{invites}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Invites", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.achievements, label: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{achievements}lim{10}mbr{${member.user.id}}`, description: `${client.language({ textId: "Achievements", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
                { emoji: client.config.emojis.quests, label: `${client.language({ textId: "Quests", guildId: interaction.guildId, locale: interaction.locale })}`, value: `usr{${interaction.user.id}}cmd{quests}mbr{${member.user.id}}`, description: `${client.language({ textId: "View quests", guildId: interaction.guildId, locale: interaction.locale })} ${member.displayName}` },
            ]
        }
        const nav_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`usr{${interaction.user.id}} menu`).addOptions(menu_options)])
        const components = []
        if (!flags.includes("Ephemeral")) components.push(nav_row)
        if (profile.inventoryRoles?.length && member.user.id === interaction.user.id) {
            components.push(new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId(`cmd{inventory-roles}wear`).setPlaceholder(`${client.language({ textId: "Wear role", guildId: interaction.guildId, locale: interaction.locale })}`)))
        }
        if (member.roles.cache.size && member.user.id === interaction.user.id) {
            components.push(new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId(`cmd{inventory-roles}unwear`).setPlaceholder(`${client.language({ textId: "Remove role", guildId: interaction.guildId, locale: interaction.locale })}`)))
        }
        const close_btn = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(client.config.emojis.close)
            .setCustomId(`usr{${interaction.user.id}}mbr{${member.user.id}} close`)
        if (!flags.includes("Ephemeral")) {
            const row = new ActionRowBuilder()
            components.push(row)    
            row.addComponents([close_btn])    
        }
        if (interaction.customId?.includes("reply") || interaction.values?.[0].includes("reply") || interaction.isChatInputCommand()) {
            return interaction.reply({ embeds: [embed], components: components, flags })
        }
        if (interaction.deferred || interaction.replied) return interaction.editReply({ embeds: [embed], components: components })
        else return interaction.update({ embeds: [embed], components: components })
    }
}