const { ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, ApplicationCommandOptionType, Collection, GuildMember } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const LimitRegexp = /lim{(.*?)}/
module.exports = {
    name: 'capitalization',
    nameLocalizations: {
        'ru': 'капитализация',
        'uk': 'капіталізація',
        'es-ES': 'capitalización'
    },
    description: 'View capitalization of items, roles and currency on this server',
    descriptionLocalizations: {
        'ru': 'Просмотр капитализации предметов, ролей и валюты на этом сервере',
        'uk': 'Перегляд капіталізації предметів, ролей та валюти на цьому сервері',
        'es-ES': 'Ver la capitalización de objetos, roles y moneda en este servidor'
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
    run: async (client, interaction, args) => {
        if (interaction.isChatInputCommand()) await interaction.deferReply()
        else {
            if (interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
            await interaction.update({ content: interaction.message.content || " ", embeds: interaction.message.embeds, components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setEmoji("⏳").setStyle(ButtonStyle.Secondary).setCustomId(`0`).setDisabled(true))]})
        }
        let min = 0
        let limit = 20
        if (!interaction.isChatInputCommand()) {
            limit = +LimitRegexp.exec(interaction.customId)?.[1]
            min = limit - 20
            if (isNaN(limit) || isNaN(min)) {
                limit = +LimitRegexp.exec(interaction.customId)?.[1]
                min = limit - 20  
            }
        }
        const settings = client.cache.settings.get(interaction.guildId)
        let capitalization = new Collection()
        capitalization.set("currency", { itemID: "currency", name: `${settings.displayCurrencyEmoji}${settings.currencyName}`, amount: client.cache.profiles.filter(profile => profile.guildID === interaction.guildId && !profile.deleteFromDB && profile.currency).reduce((prev, curr) => prev + curr.currency, 0)})
        const profiles = client.cache.profiles.filter(profile => profile.guildID === interaction.guildId && !profile.deleteFromDB && (profile.inventory.filter(item => item.amount > 0).length || profile.inventoryRoles?.length))
        profiles.forEach(profile => {
            if (profile.inventory.filter(item => item.amount > 0).length) {
                const inventory = profile.inventory.filter(item => item.amount > 0)
                inventory.forEach(item => {
                    const amount = item.amount
                    item = client.cache.items.find(e => e.itemID === item.itemID && !e.temp && e.found && e.visible)
                    if (item) {
                        const capitalization_item = capitalization.get(item.itemID)
                        if (capitalization_item) {
                            capitalization.set(item.itemID, { itemID: capitalization_item.itemID, name: capitalization_item.name, amount: capitalization_item.amount + amount })
                        } else {
                            capitalization.set(item.itemID, { itemID: item.itemID, name: `${item.displayEmoji}${item.name}`, amount: amount })
                        }
                    }
                })
            }
            if (profile.inventoryRoles?.length) {
                const inventoryRoles = profile.inventoryRoles
                inventoryRoles.forEach(role => {
                    const amount = role.amount
                    const guildRole = interaction.guild.roles.cache.get(role.id)
                    if (guildRole) {
                        const capitalization_item = capitalization.get(guildRole.id)
                        if (capitalization_item) {
                            capitalization.set(guildRole.id, { itemID: capitalization_item.itemID, name: capitalization_item.name, amount: capitalization_item.amount + amount })
                        } else {
                            capitalization.set(guildRole.id, { itemID: guildRole.id, name: `<@&${guildRole.id}>`, amount: amount })
                        }
                    }
                })
            }
        })
        capitalization = capitalization.map(e => e)
        const total_capitalization = capitalization.reduce((prev, curr) => prev + curr.amount, 0)
        const capitalization_array = capitalization.sort((a, b) => b.amount - a.amount).map(e => {
            let percent = e.amount/total_capitalization*100
            if (percent > 99.99) percent = `>99.99%`
            else if (percent < 0.01) percent = `<0.01%`
            else percent = `${percent.toFixed(2)}%`
            return `${capitalization.findIndex(i => i.itemID === e.itemID) + 1}. **${e.name}** (${e.amount.toLocaleString()}) \`${percent}\``
        }).slice(min, limit)
        const embed = new EmbedBuilder()
            .setTitle(`${client.language({ textId: "Server capitalization", guildId: interaction.guildId })} ${interaction.guild.name}`)
            .setDescription(capitalization_array.join("\n"))
            .setColor(3093046)
            .setFooter({ text: `${client.language({ textId: "Total capitalization", guildId: interaction.guildId })}: ${total_capitalization.toLocaleString()}` })
        const array_btn = [
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{capitalization}usr{${interaction.user.id}}lim{20}1`).setDisabled((capitalization.length <= 20 && min == 0) || (capitalization.length > 20 && min < 20)),
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowLeft}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{capitalization}usr{${interaction.user.id}}lim{${limit - 20}}2`).setDisabled((capitalization.length <= 20 && min == 0) || (capitalization.length > 20 && min < 20)),
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{capitalization}usr{${interaction.user.id}}lim{${limit + 20}}3`).setDisabled((capitalization.length <= 20 && min == 0) || (capitalization.length > 20 && min >= capitalization.length - 20)),
            new ButtonBuilder().setEmoji(`${client.config.emojis.arrowRight2}`).setStyle(ButtonStyle.Secondary).setCustomId(`cmd{capitalization}usr{${interaction.user.id}}lim{${capitalization.length + (capitalization.length % 20 == 0 ? 0 : 20 - (capitalization.length % 20))}}4`).setDisabled((capitalization.length <= 20 && min == 0) || (capitalization.length > 20 && min >= capitalization.length - 20))
        ]
        return interaction.editReply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(array_btn)] })
    }
}