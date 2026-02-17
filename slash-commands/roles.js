const { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, Collection } = require("discord.js")
const IndexRegexp = /index{(.*?)}/
module.exports = {
    name: 'roles',
    nameLocalizations: {
        'ru': `роли`,
        'uk': `ролі`,
        'es-ES': `roles`
    },
    description: 'View roles income',
    descriptionLocalizations: {
        'ru': `Посмотреть роли с доходом`,
        'uk': `Переглянути ролі з доходом`,
        'es-ES': `Ver roles con ingresos`
    },
    dmPermission: false,
    group: `general-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction) => {
        const settings = client.cache.settings.get(interaction.guildId)
        const roles = client.cache.roles.filter(e => e.guildID === interaction.guildId && e.isEnabled).map(e => e)
        const embed = new EmbedBuilder().setColor(3093046)
        if (!roles.length) {
            embed.setTitle(`${client.language({ textId: "No roles with income or loss on server", guildId: interaction.guildId, locale: interaction.locale })}`)
            if (interaction.member.permissions.has("Administrator")) embed.setDescription(`${client.language({ textId: "To create a role with income or loss, use command", guildId: interaction.guildId, locale: interaction.locale })} **/manager-roles create**`)
            if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], flags: ["Ephemeral"] })
            else return interaction.update({ embeds: [embed] }) 
        } else {
            let index = 0
            if (interaction.isButton()) {
                index = +IndexRegexp.exec(interaction.customId)?.[1]
            }
            const role = roles[index]
            const guildRole = await interaction.guild.roles.fetch(role.id).catch(e => null)
            embed.setTitle(guildRole?.name || "Deleted Role")
            if (guildRole) embed.setThumbnail(guildRole.iconURL())
            const description = [
                `${client.language({ textId: "Role", guildId: interaction.guildId, locale: interaction.locale })}: ${guildRole ? `<@&${guildRole.id}>` : "Deleted Role"}`,
                role.type === "static" ? `${client.language({ textId: "Cooldown (hours)", guildId: interaction.guildId, locale: interaction.locale })}: ${role.cooldown}` : undefined,
                `${client.config.emojis.XP}${client.language({ textId: "XP", guildId: interaction.guildId, locale: interaction.locale })}: ${role.xp}${role.type === "static" ? `` : `%`}`,
                `${settings.displayCurrencyEmoji}${settings.currencyName}: ${role.cur}${role.type === "static" ? `` : `%`}`,
                `${client.config.emojis.RP}${client.language({ textId: "Reputation", guildId: interaction.guildId, locale: interaction.locale })}: ${role.rp}${role.type === "static" ? `` : `%`}`,
            ].filter(e => e)
            if (role.items.length) {
                description.push(`${client.config.emojis.box}${client.language({ textId: "Items", guildId: interaction.guildId, locale: interaction.locale })}:\n• ${role.items.map(a => {
                    const item = client.cache.items.find(e => e.itemID === a.itemID && e.enabled && !e.temp)
                    if (item) {
                        return `${item.displayEmoji}**${item.name}** ${a.amount}${role.type === "static" ? `` : `%`}`
                    }
                    else return `**${a.itemID}** ${a.amount}${role.type === "static" ? `` : `%`}`
                }).join("\n• ")}`)
            }
            embed.setDescription(description.join("\n"))
            if (guildRole) embed.setColor(guildRole.color)
            const first_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{roles}index{0}1`).setDisabled((roles.length == 1 && index == 0) || (roles.length !== 1 && index == 0))
            const previous_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{roles}index{${index-1}}2`).setDisabled((roles.length == 1 && index == 0) || (roles.length !== 1 && index == 0))
            const next_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{roles}index{${index+1}}3`).setDisabled((roles.length == 1 && index == 0) || (roles.length !== 1 && index == roles.length - 1))
            const last_page_btn = new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{roles}index{${roles.length - 1}}4`).setDisabled((roles.length == 1 && index == 0) || (roles.length !== 1 && index == roles.length - 1))
            if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(first_page_btn, previous_page_btn, next_page_btn, last_page_btn)], flags: ["Ephemeral"] })
            else return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(first_page_btn, previous_page_btn, next_page_btn, last_page_btn)] })
        }
    }
}