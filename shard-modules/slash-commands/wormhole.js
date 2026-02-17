const { EmbedBuilder, Collection, Webhook, ApplicationCommandOptionType } = require("discord.js")
module.exports = {
    name: 'wormhole',
    nameLocalizations: {
        'ru': `червоточина`,
        'uk': `червоточина`,
        'es-ES': `agujero-de-gusano`
    },
    description: 'View wormhole info',
    descriptionLocalizations: {
        'ru': `Посмотреть информацию о червоточине`,
        'uk': `Переглянути інформацію про червоточину`,
        'es-ES': `Ver información del agujero de gusano`
    },
    options: [
        {
            name: 'name',
            nameLocalizations: {
                'ru': `название`,
                'uk': `назва`,
                'es-ES': `nombre`
            },
            description: 'Wormhole name',
            descriptionLocalizations: {
                'ru': `Название червоточины`,
                'uk': `Назва червоточини`,
                'es-ES': `Nombre del agujero de gusano`
            },
            type: ApplicationCommandOptionType.String,
            required: true,
            autocomplete: true
        },
    ],
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
        const wormhole = client.cache.wormholes.find(e => e.guildID === interaction.guildId && e.name.toLowerCase() === args.name.toLowerCase() && e.chance && e.itemID && e.amountFrom && e.amountTo && e.deleteTimeOut !== undefined && e.webhookId)
        if (!wormhole) {
            return interaction.reply({ content: `${client.config.emojis.NO}${client.language({ textId: "Wormhole with this name does not exist", guildId: interaction.guildId, locale: interaction.locale })} (${args.name})`, flags: ["Ephemeral"] })
        }
        let webhook
        if (wormhole.webhookId) {
            webhook = client.cache.webhooks.get(wormhole.webhookId)
            if (!webhook) {
                webhook = await client.fetchWebhook(wormhole.webhookId).catch(e => null)
                if (webhook instanceof Webhook) client.cache.webhooks.set(webhook.id, webhook)
            }    
        }
        const settings = client.cache.settings.get(interaction.guildId)
        const item = client.cache.items.find(e => !e.temp && e.itemID === wormhole.itemID)
        const emoji = item ? item.displayEmoji : wormhole.itemID == "currency" ? settings.displayCurrencyEmoji : wormhole.itemID == "xp" ? client.config.emojis.XP : wormhole.itemID == "rp" ? client.config.emojis.RP : ""
        const embed = new EmbedBuilder()
            .setColor(3093046)
            .setAuthor({ name: `${client.language({ textId: "Wormholes", guildId: interaction.guildId, locale: interaction.locale })}` })
            .setTitle(wormhole.name)
            .setDescription([
                `${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })}: ${item ? `${emoji}${item.name}` : wormhole.itemID == "currency" ? `${emoji}${settings.currencyName}` : wormhole.itemID == "xp" ? `${emoji}XP` : wormhole.itemID == "rp" ? `${emoji}RP` : `${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `${client.language({ textId: "Chance", guildId: interaction.guildId, locale: interaction.locale })}: ${wormhole.chance ? `${wormhole.chance}%`: `${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `${client.language({ textId: `Cron pattern`, guildId: interaction.guildId, locale: interaction.locale })}: ${wormhole.cronPattern ? `${wormhole.cronPattern}`: `${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `${client.language({ textId: "Drop amount", guildId: interaction.guildId, locale: interaction.locale })}: ${wormhole.amountFrom && wormhole.amountTo ? wormhole.amountFrom == wormhole.amountTo ? `${wormhole.amountFrom} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : `${client.language({ textId: "from", guildId: interaction.guildId, locale: interaction.locale })} ${wormhole.amountFrom} ${client.language({ textId: "to", guildId: interaction.guildId, locale: interaction.locale })} ${wormhole.amountTo} ${client.language({ textId: "pcs", guildId: interaction.guildId, locale: interaction.locale })}.` : `${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `${client.language({ textId: "Lifetime", guildId: interaction.guildId, locale: interaction.locale })}: ${wormhole.deleteTimeOut === undefined ? `${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}` : wormhole.deleteTimeOut === 0 ? `${client.language({ textId: "Infinite", guildId: interaction.guildId, locale: interaction.locale })}` : `${wormhole.deleteTimeOut / 1000} s.`}`,
                `${client.language({ textId: "Message deleted after collection", guildId: interaction.guildId, locale: interaction.locale })}: ${wormhole.deleteAfterTouch ? client.config.emojis.YES : client.config.emojis.NO}`,
                `${client.language({ textId: "Enabled", guildId: interaction.guildId, locale: interaction.locale })}: ${wormhole.enabled ? client.config.emojis.YES : client.config.emojis.NO}`,
                `${client.language({ textId: "Spawns remaining", guildId: interaction.guildId, locale: interaction.locale })}: ${client.language({ textId: wormhole.runsLeft, guildId: interaction.guildId, locale: interaction.locale })}`,
                `${client.language({ textId: "Webhook", guildId: interaction.guildId, locale: interaction.locale })}: ${!wormhole.webhookId ? `${client.language({ textId: "Selection required", guildId: interaction.guildId, locale: interaction.locale })}` : webhook ? `${webhook.name} -> <#${webhook.channelId}> ${wormhole.threadId ? `-> <#${wormhole.threadId}>` : ``}` : `${client.language({ textId: "Unknown webhook", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                `${client.language({ textId: "Next spawns", guildId: interaction.guildId, locale: interaction.locale })}${wormhole.runsLeft > 10 ? ` (${10})` : wormhole.runsLeft <= 0 ? "" : ` (${wormhole.runsLeft})`}: ${!wormhole.enabled ? `${client.language({ textId: "To display, you need to start the wormhole", guildId: interaction.guildId, locale: interaction.locale })}` : `${wormhole.cronJob.nextRuns(wormhole.runsLeft > 10 ? 10 : wormhole.runsLeft).map(date => `<t:${Math.floor(date.getTime()/1000)}:R>`).join(", ")}` }`
            ].join("\n"))
            .setFooter({ text: `ID: ${wormhole.wormholeID}` })
            .setColor(3093046)
        return interaction.reply({ embeds: [embed], flags: ["Ephemeral"] })
    }
}