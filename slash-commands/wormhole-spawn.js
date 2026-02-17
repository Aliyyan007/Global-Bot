const { ApplicationCommandOptionType, Collection, Webhook } = require("discord.js")
module.exports = {
    name: 'wormhole-spawn',
    nameLocalizations: {
        'ru': `заспавнить-червоточину`,
        'uk': `заспавнити-червоточину`,
        'es-ES': `generar-agujero-de-gusano`
    },
    description: 'Spawns the wormhole',
    descriptionLocalizations: {
        'ru': `Заспавнить червоточину`,
        'uk': `Заспавнити червоточину`,
        'es-ES': `Generar un agujero de gusano`
    },
    options: [
        {
            name: 'wormhole',
            nameLocalizations: {
                'ru': `червоточина`,
                'uk': `червоточина`,
                'es-ES': `agujero-de-gusano`
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
        }
    ],
    dmPermission: false,
    defaultMemberPermissions: "Administrator",
    group: `admins-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const wormhole = client.cache.wormholes.find(e => e.name.toLowerCase() === args.wormhole.toLowerCase() && e.guildID === interaction.guildId && e.chance && e.itemID && e.amountFrom && e.amountTo && e.deleteTimeOut !== undefined && e.webhookId)
        if (!wormhole) return interaction.editReply({ content: `${client.config.emojis.NO}${client.language({ textId: "Wormhole with this name does not exist", guildId: interaction.guildId, locale: interaction.locale })} (${args.wormhole})` })
        const item = client.cache.items.get(wormhole.itemID)
        if (!item && wormhole.itemID !== "currency" && wormhole.itemID !== "xp" && wormhole.itemID !== "rp") {
            return interaction.editReply({ content: `${client.language({ textId: "Error: item with ID", guildId: interaction.guildId, locale: interaction.locale })} ${wormhole.itemID} ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"]  })
        }
        let webhook = client.cache.webhooks.get(wormhole.webhookId)
        if (!webhook) {
            webhook = await client.fetchWebhook(wormhole.webhookId).catch(e => null)
            if (webhook instanceof Webhook) client.cache.webhooks.set(webhook.id, webhook)
        }
        if (!webhook) {
            return interaction.editReply({ content: `${client.language({ textId: "Error: webhook with ID", guildId: interaction.guildId, locale: interaction.locale })} ${wormhole.webhook} ${client.language({ textId: "does not exist", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"]  })
        }
        wormhole.spawn(webhook)
        return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Wormhole spawned", guildId: interaction.guildId, locale: interaction.locale })}` })
    }
}