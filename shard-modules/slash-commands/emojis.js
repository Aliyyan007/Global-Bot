const { ApplicationCommandOptionType, StringSelectMenuBuilder, ActionRowBuilder, Collection } = require("discord.js")
module.exports = {
    name: 'emojis',
    nameLocalizations: {
        'ru': `эмодзи`,
        'uk': `емодзі`,
        'es-ES': `emojis`
    },
    description: 'Get an emoji ID and emoji name',
    descriptionLocalizations: {
        'ru': `Получить ID эмодзи и его имя`,
        'uk': `Отримати ID емодзі та його назву`,
        'es-ES': `Obtener ID y nombre del emoji`
    },
    options: [
        {
            name: 'animated',
            nameLocalizations: {
                'ru': 'анимировано',
                'uk': 'анімовано',
                'es-ES': 'animado'
            },
            description: 'Emoji is animated?',
            descriptionLocalizations: {
                'ru': 'Эмодзи анимировано?',
                'uk': 'Емодзі анімоване?',
                'es-ES': '¿El emoji está animado?'
            },
            type: ApplicationCommandOptionType.Boolean,
            required: true
        },
        {
            name: 'length',
            nameLocalizations: {
                'ru': 'длина',
                'uk': 'довжина',
                'es-ES': 'longitud'
            },
            description: 'Length of returning emojis',
            descriptionLocalizations: {
                'ru': 'Длина возвращаемых эмодзи',
                'uk': 'Довжина повертаємих емодзі',
                'es-ES': 'Cantidad de emojis a mostrar'
            },
            type: ApplicationCommandOptionType.Integer,
            required: true,
            choices: [
                {
                    name: '1-125',
                    value: 1
                },
                {
                    name: '126-250',
                    value: 2
                }
            ]
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
        if (interaction.isChatInputCommand()) {
            const components = await selectEmojisComponent(client, interaction, args)
            interaction.reply({ content: `${client.language({ textId: "Select emoji", guildId: interaction.guildId, locale: interaction.locale })}:`, components: components, flags: ["Ephemeral"] })
        }
        if (interaction.isStringSelectMenu()) {
            const emoji = interaction.guild.emojis.cache.get(interaction.values[0])
            await interaction.deferUpdate()
            interaction.followUp({ content: `${client.language({ textId: "Syntax", guildId: interaction.guildId, locale: interaction.locale })}: \`<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>\`\n${client.language({ textId: "Output", guildId: interaction.guildId, locale: interaction.locale })}: <${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>\nID: ${emoji.id}`, flags: ["Ephemeral"] })
        }
    }
}
async function selectEmojisComponent(client, interaction, args) {
    let emojis = interaction.guild.emojis.cache.filter(emoji => emoji.animated === args.animated)
    if (args.length === 1) emojis = emojis.map(emoji => ({ id: emoji.id, name: emoji.name, animated: emoji.animated })).slice(0, 125)
    else emojis = emojis.map(emoji => ({ id: emoji.id, name: emoji.name, animated: emoji.animated })).slice(125, 250)
    const length = emojis.length
    let selectMenu1 = new StringSelectMenuBuilder()
    .setCustomId(`cmd{emojis} 1`)
    let selectMenu2 = new StringSelectMenuBuilder()
    .setCustomId(`cmd{emojis} 2`)
    let selectMenu3 = new StringSelectMenuBuilder()
    .setCustomId(`cmd{emojis} 3`)
    let selectMenu4 = new StringSelectMenuBuilder()
    .setCustomId(`cmd{emojis} 4`)
    let selectMenu5 = new StringSelectMenuBuilder()
    .setCustomId(`$cmd{emojis} 5`)
    let optionsArray = []
    if (length == 0) selectMenu1.setPlaceholder(`${client.language({ textId: "No emoji", guildId: interaction.guildId, locale: interaction.locale })}`).setDisabled(true).addOptions([{label: `${client.language({ textId: "No emoji", guildId: interaction.guildId, locale: interaction.locale })}`, value: "0"}])
    for (let i = 0; i < length; i++) {
        optionsArray.push({
            emoji: `<${emojis[i].animated ? "a" : ""}:${emojis[i].name}:${emojis[i].id}>`,
            label: emojis[i].name,
            value: emojis[i].id,
        })
        if (i == 24 || (i < 24 && i == length - 1)) {
            selectMenu1.addOptions(optionsArray)
            if (args.length === 1) selectMenu1.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 1-${i+1}`)
            else selectMenu1.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 126-${126 + i}`)
            optionsArray = []
        }
        if (i == 49 || (i < 49 && i == length - 1)) {
            selectMenu2.addOptions(optionsArray)
            if (args.length === 1) selectMenu2.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 26-${i + 1}`)
            else selectMenu2.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 151-${151 + i - 25}`)
            optionsArray = []
        }
        if (i == 74 || (i < 74 && i == length - 1)) {
            selectMenu3.addOptions(optionsArray)
            if (args.length === 1) selectMenu3.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 51-${i+1}`)
            else selectMenu3.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 176-${176 + i - 50}`)
            optionsArray = []
        }
        if (i == 99 || (i < 99 && i == length - 1)) {
            selectMenu4.addOptions(optionsArray)
            if (args.length === 1) selectMenu4.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 76-${i+1}`)
            else selectMenu4.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 201-${201 + i - 75}`)
            optionsArray = []
        }
        if (i == 124 || (i < 124 && i == length - 1)) {
            selectMenu5.addOptions(optionsArray)
            if (args.length === 1) selectMenu5.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 101-${i+1}`)
            else selectMenu5.setPlaceholder(`${client.language({ textId: "Emoji", guildId: interaction.guildId, locale: interaction.locale })} 226-${226 + i - 100}`)
        }
    }
    if (length > 100) return [new ActionRowBuilder().addComponents([selectMenu1]), new ActionRowBuilder().addComponents([selectMenu2]), new ActionRowBuilder().addComponents([selectMenu3]), new ActionRowBuilder().addComponents([selectMenu4]), new ActionRowBuilder().addComponents([selectMenu5])]
    else if (length > 75) return [new ActionRowBuilder().addComponents([selectMenu1]), new ActionRowBuilder().addComponents([selectMenu2]), new ActionRowBuilder().addComponents([selectMenu3]), new ActionRowBuilder().addComponents([selectMenu4])]
    else if (length > 50) return [new ActionRowBuilder().addComponents([selectMenu1]), new ActionRowBuilder().addComponents([selectMenu2]), new ActionRowBuilder().addComponents([selectMenu3])]
    else if (length > 25) return [new ActionRowBuilder().addComponents([selectMenu1]), new ActionRowBuilder().addComponents([selectMenu2])]
    else return [new ActionRowBuilder().addComponents([selectMenu1])]
}