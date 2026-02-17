const { EmbedBuilder, Collection } = require("discord.js")
module.exports = {
    name: 'ping',
    nameLocalizations: {
        'ru': 'пинг',
        'uk': 'пінг',
        'es-ES': 'ping'
    },
    description: 'Technical information about bot',
    descriptionLocalizations: {
        'ru': 'Техническая информация о боте',
        'uk': 'Технічна інформація про бота',
        'es-ES': 'Información técnica sobre el bot'
    },
    dmPermission: true,
    group: `general-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const embed = new EmbedBuilder()
            .setColor("#2F3236")
            .setTitle(client.user.username)
            .setThumbnail(client.user.avatarURL())
        await client.shard.broadcastEval(async(c, { guildId, locale }) => {
            return `\`${c.shard.ids[0]}\` — ${c.ws.status === 0 ? `🟢${c.language({ textId: "Online", guildId, locale })}` : c.ws.status === 1 ? `🌙${c.language({ textId: "Connecting", guildId, locale })}` : c.ws.status === 2 ? `🌙${c.language({ textId: "Reconnecting", guildId, locale })}` : c.ws.status === 3 ? `🌙${c.language({ textId: "Idle", guildId, locale })}` : c.ws.status === 4 ? `🌙${c.language({ textId: "Nearly", guildId, locale })}` : c.ws.status === 5 ? `🔴${c.language({ textId: "Disconnected", guildId, locale })}` : c.ws.status === 6 ? `🌙${c.language({ textId: "Waiting for guilds", guildId, locale })}` : c.ws.status === 7 ? `🌙${c.language({ textId: "Identifying", guildId, locale })}` : `🌙${c.language({ textId: "Resuming", guildId, locale })}`} • ${c.ws.ping || 0} ms`
        }, { context: { guildId: interaction.guildId, locale: interaction.locale } }).then(data => embed.setDescription(data.join("\n"))).catch(e => embed.setDescription(`${client.config.emojis.NO}${e.message}`))
        const statsEmbed = new EmbedBuilder()
            .setTitle(`${client.language({ textId: "Command usage statistics", guildId: interaction.guildId, locale: interaction.locale })}`)
            .setColor(3093046)
        const commandsUses = await client.commandsUsesSchema.find().sort({"alltime.uses": -1 })
        const alltimeUses = commandsUses.reduce((acc, command) => acc += command.alltime.uses, 0)
        const monthUses = commandsUses.reduce((acc, command) => acc += command.monthly.uses, 0)
        const weekUses = commandsUses.reduce((acc, command) => acc += command.weekly.uses, 0)
        const dayUses = commandsUses.reduce((acc, command) => acc += command.daily.uses, 0)
        const hourUses = commandsUses.reduce((acc, command) => acc += command.hourly.uses, 0)
        const prevMonthUses = commandsUses.reduce((acc, command) => acc += command.lastMonthUses, 0)
        const prevWeekUses = commandsUses.reduce((acc, command) => acc += command.lastWeekUses, 0)
        const prevDayUses = commandsUses.reduce((acc, command) => acc += command.lastDayUses, 0)
        const prevHourUses = commandsUses.reduce((acc, command) => acc += command.lastHourUses, 0)
        const TOP10 = commandsUses.slice(0, 10).map((command, index) => {
            return `${index + 1}. **${command.commandName}** (${command.alltime.uses})`
        })
        statsEmbed.addFields([
            { name: `${client.language({ textId: "All time", guildId: interaction.guildId, locale: interaction.locale })}`, value: alltimeUses.toString(), inline: true },
            { name: `${client.language({ textId: "Month", guildId: interaction.guildId, locale: interaction.locale })}`, value: `${monthUses} ${monthUses < prevMonthUses && prevMonthUses !== 0 ? client.config.emojis.DOWN : monthUses > prevMonthUses && prevMonthUses !== 0 ? client.config.emojis.UP : ""}${prevMonthUses === 0 ? "" : `${Math.round(Math.abs((monthUses / prevMonthUses - 1) * 100))}%`}`, inline: true },
            { name: `${client.language({ textId: "Week", guildId: interaction.guildId, locale: interaction.locale })}`, value: `${weekUses} ${weekUses < prevWeekUses && prevWeekUses !== 0 ? client.config.emojis.DOWN : weekUses > prevWeekUses && prevWeekUses !== 0 ? client.config.emojis.UP : ""}${prevWeekUses === 0 ? "" : `${Math.round(Math.abs((weekUses / prevWeekUses - 1) * 100))}%`}`, inline: true },
            { name: `${client.language({ textId: "Day", guildId: interaction.guildId, locale: interaction.locale })}`, value: `${dayUses} ${dayUses < prevDayUses && prevDayUses !== 0 ? client.config.emojis.DOWN : dayUses > prevDayUses && prevDayUses !== 0 ? client.config.emojis.UP : ""}${prevDayUses === 0 ? "" : `${Math.round(Math.abs((dayUses / prevDayUses - 1) * 100))}%`}`, inline: true },
            { name: `${client.language({ textId: "1 hour", guildId: interaction.guildId, locale: interaction.locale })}`, value: `${hourUses} ${hourUses < prevHourUses && prevHourUses !== 0 ? client.config.emojis.DOWN : hourUses > prevHourUses && prevHourUses !== 0 ? client.config.emojis.UP : ""}${prevHourUses === 0 ? "" : `${Math.round(Math.abs((hourUses / prevHourUses - 1) * 100))}%`}`, inline: true },
            { name: `${client.language({ textId: "TOP-10 commands", guildId: interaction.guildId, locale: interaction.locale })}`, value: TOP10.join("\n") }
        ])
        interaction.editReply({ embeds: [embed, statsEmbed] })
    }
}