const { ApplicationCommandOptionType, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const MemberRegexp = /mbr{(.*?)}/
module.exports = {
    name: 'user-activities',
    nameLocalizations: {
        'ru': `активности-пользователя`,
        'uk': `активності-користувача`,
        'es-ES': `actividades-usuario`
    },
    description: 'Disable or enable an ability to gain currency, XP, RP and items for activities',
    descriptionLocalizations: {
        'ru': `Включить или выключить возможность получать валюту, опыт, репутацию, предметы за активности`,
        'uk': `Увімкнути або вимкнути можливість отримувати валюту, досвід, репутацію, предмети за активності`,
        'es-ES': `Activar o desactivar la capacidad de obtener moneda, XP, RP y objetos por actividades`
    },
    options: [
        {
            name: 'user',
            nameLocalizations: {
                'ru': `юзер`,
                'uk': `користувач`,
                'es-ES': `usuario`
            },
            description: 'The user',
            descriptionLocalizations: {
                'ru': `Пользователь`,
                'uk': `Користувач`,
                'es-ES': `Usuario`
            },
            type: ApplicationCommandOptionType.User,
            required: true
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admins-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        if (!interaction.isChatInputCommand() && interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        const { guild } = interaction
        const userID = args?.user || MemberRegexp.exec(interaction.customId)?.[1]
        if (!userID) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Invalid ID", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [], flags: ["Ephemeral"] })
        }
        const member = await guild.members.fetch(userID).catch(e => null)
        if (!member) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "User not found on server", guildId: interaction.guildId, locale: interaction.locale })}`, embeds: [], components: [], flags: ["Ephemeral"] })
        }
        if (member.user.bot) {
            return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "You cannot use this command for a bot", guildId: interaction.guildId, locale: interaction.locale })}.`, embeds: [], components: [], flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, member.user.id, guild.id)
        const embed = new EmbedBuilder()
        embed.setThumbnail(member.displayAvatarURL())
        embed.setTitle(member.displayName)
        embed.setAuthor({ name: `${client.language({ textId: "Activities", guildId: interaction.guildId, locale: interaction.locale })}` })
        embed.setColor(member.displayHexColor)
        if (interaction.customId?.includes("select")) {
            for (let values of interaction.values) {
                values = values.split('.')
                if (!profile.blockActivities) profile.blockActivities = { [values[0]]: { [values[1]]: true }}
                else if (!profile.blockActivities[values[0]]) profile.blockActivities[values[0]] = { [values[1]]: true }
                else {
                    if (profile.blockActivities?.[values[0]][values[1]]) {
                        profile.blockActivities[values[0]][values[1]] = undefined
                        if (!Object.values(profile.blockActivities[values[0]]).filter(e => e !== undefined).length) profile.blockActivities[values[0]] = undefined
                        if (!Object.values(profile.blockActivities).filter(e => e !== undefined).length) profile.blockActivities = undefined
                    }
                    else profile.blockActivities[values[0]][values[1]] = true    
                }
            }
            await profile.save().catch(err => console.error(`Failed to save profile ${profile.userID}:`, err))
        }
        const activities = [
            `> ${profile.blockActivities?.["message"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving XP for message", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["message"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving currency for message", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["message"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving reputation for message", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["message"]?.items ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving items for message", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["voice"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving XP for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["voice"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving currency for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["voice"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving reputation for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["voice"]?.items ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving items for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["invite"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving XP for invite", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["invite"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving currency for invite", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["invite"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving reputation for invite", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["invite"]?.items ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving items for invite", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["bump"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving XP for bump", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["bump"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving currency for bump", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["bump"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving reputation for bump", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["bump"]?.items ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving items for bump", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["like"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving XP for like", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["like"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving currency for like", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["like"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving reputation for like", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["like"]?.items ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving items for like", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["item"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving XP for first item find", guildId: interaction.guildId, locale: interaction.locale })}`,
            `> ${profile.blockActivities?.["item"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}${client.language({ textId: "Receiving currency for first item find", guildId: interaction.guildId, locale: interaction.locale })}`,
        ]
        embed.setDescription(activities.join("\n"))
        const menu_options = [
            { emoji: `${profile.blockActivities?.["message"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["message"]?.XP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "XP for message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `message.XP` }, 
            { emoji: `${profile.blockActivities?.["message"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["message"]?.CUR ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Currency for message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `message.CUR` },
            { emoji: `${profile.blockActivities?.["message"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["message"]?.RP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Reputation for message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `message.RP` },
            { emoji: `${profile.blockActivities?.["message"]?.items ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["message"]?.items ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Items for message", guildId: interaction.guildId, locale: interaction.locale })}`, value: `message.items` },
            { emoji: `${profile.blockActivities?.["voice"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["voice"]?.XP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "XP for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `voice.XP` },
            { emoji: `${profile.blockActivities?.["voice"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["voice"]?.CUR ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Currency for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `voice.CUR` },
            { emoji: `${profile.blockActivities?.["voice"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["voice"]?.RP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Reputation for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `voice.RP` },
            { emoji: `${profile.blockActivities?.["voice"]?.items ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["voice"]?.items ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Items for voice chat", guildId: interaction.guildId, locale: interaction.locale })}`, value: `voice.items` },
            { emoji: `${profile.blockActivities?.["invite"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["invite"]?.XP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "XP for invite", guildId: interaction.guildId, locale: interaction.locale })}`, value: `invite.XP` },
            { emoji: `${profile.blockActivities?.["invite"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["invite"]?.CUR ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Currency for invite", guildId: interaction.guildId, locale: interaction.locale })}`, value: `invite.CUR` },
            { emoji: `${profile.blockActivities?.["invite"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["invite"]?.RP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Reputation for invite", guildId: interaction.guildId, locale: interaction.locale })}`, value: `invite.RP` },
            { emoji: `${profile.blockActivities?.["invite"]?.items ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["invite"]?.items ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Items for invite", guildId: interaction.guildId, locale: interaction.locale })}`, value: `invite.items` },
            { emoji: `${profile.blockActivities?.["bump"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["bump"]?.XP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "XP for bump", guildId: interaction.guildId, locale: interaction.locale })}`, value: `bump.XP` },
            { emoji: `${profile.blockActivities?.["bump"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["bump"]?.CUR ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Currency for bump", guildId: interaction.guildId, locale: interaction.locale })}`, value: `bump.CUR` },
            { emoji: `${profile.blockActivities?.["bump"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["bump"]?.RP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Reputation for bump", guildId: interaction.guildId, locale: interaction.locale })}`, value: `bump.RP` },
            { emoji: `${profile.blockActivities?.["bump"]?.items ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["bump"]?.items ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Items for bump", guildId: interaction.guildId, locale: interaction.locale })}`, value: `bump.items` },
            { emoji: `${profile.blockActivities?.["like"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["like"]?.XP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "XP for like", guildId: interaction.guildId, locale: interaction.locale })}`, value: `like.XP` },
            { emoji: `${profile.blockActivities?.["like"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["like"]?.CUR ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Currency for like", guildId: interaction.guildId, locale: interaction.locale })}`, value: `like.CUR` },
            { emoji: `${profile.blockActivities?.["like"]?.RP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["like"]?.RP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Reputation for like", guildId: interaction.guildId, locale: interaction.locale })}`, value: `like.RP` },
            { emoji: `${profile.blockActivities?.["like"]?.items ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["like"]?.items ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Items for like", guildId: interaction.guildId, locale: interaction.locale })}`, value: `like.items` },
            { emoji: `${profile.blockActivities?.["item"]?.XP ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["item"]?.XP ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "XP for first item find", guildId: interaction.guildId, locale: interaction.locale })}`, value: `item.XP` },
            { emoji: `${profile.blockActivities?.["item"]?.CUR ? client.config.emojis.NO : client.config.emojis.YES}`, label: `${profile.blockActivities?.["item"]?.CUR ? `${client.language({ textId: "Enable", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Disable", guildId: interaction.guildId, locale: interaction.locale })}`}: ${client.language({ textId: "Currency for first item find", guildId: interaction.guildId, locale: interaction.locale })}`, value: `item.CUR` },
        ]
        const first_row = new ActionRowBuilder().addComponents([new StringSelectMenuBuilder().setCustomId(`mbr{${member.user.id}}cmd{user-activities} select usr{${interaction.user.id}}`).addOptions(menu_options).setMaxValues(menu_options.length).setPlaceholder(`${client.language({ textId: "Select up to", guildId: interaction.guildId, locale: interaction.locale })} ${menu_options.length} ${client.language({ textId: "values", guildId: interaction.guildId, locale: interaction.locale })}`)])
        if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [first_row] })
        else {
            await interaction.message.edit({ embeds: [embed], components: [first_row] })
            if (!interaction.deferred) return await interaction.deferUpdate()
            else return
        }
    }
}