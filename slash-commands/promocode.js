const { ApplicationCommandOptionType, EmbedBuilder, Collection } = require("discord.js")
const { AchievementType } = require("../enums")
module.exports = {
    name: 'promocode',
    nameLocalizations: {
        'ru': 'промокод',
        'uk': 'промокод',
        'es-ES': 'codigo-promocional'
    },
    description: 'Use promocode',
    descriptionLocalizations: {
        'ru': 'Использовать промокод',
        'uk': 'Використати промокод',
        'es-ES': 'Usar código promocional'
    },
    options: [
        {
            name: 'code',
            nameLocalizations: {
                'ru': 'код',
                'uk': 'код',
                'es-ES': 'codigo'
            },
            description: 'Code name',
            descriptionLocalizations: {
                'ru': 'Название кода',
                'uk': 'Назва коду',
                'es-ES': 'Nombre del código'
            },
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    dmPermission: false,
    group: `inventory-group`,
    cooldowns: new Collection(),
    /**
     *
     * @param {Discord} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        const promocode = client.cache.promocodes.find(e => e.code === args.code && e.guildID === interaction.guildId)
        if (!promocode) {
            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Promocode not found", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
        if (!promocode.isEnabled) {
            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Promocode is disabled", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
        if (promocode.used.includes(interaction.user.id)) {
            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "You have already used this promocode", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
        if (promocode.used.length >= promocode.amountUses) {
            return interaction.reply({ content: `${client.config.emojis.NO}**${client.language({ textId: "Maximum uses reached", guildId: interaction.guildId, locale: interaction.locale })}**`, flags: ["Ephemeral"] })
        }
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (promocode.permission) {
            const permission = client.cache.permissions.get(promocode.permission)
            if (permission) {
                const isPassing = permission.for(profile, interaction.member, interaction.channel, interaction)
                if (isPassing.value === false) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setColor(3093046).setTitle(`${client.language({ textId: "This interaction requires:", guildId: interaction.guildId, locale: interaction.locale })}`).setDescription(isPassing.reasons.join("\n"))], flags: ["Ephemeral"] })
                }
            }
        }
        await interaction.deferReply({ flags: ["Ephemeral"] })
        const rewards = await promocode.use(profile, interaction)
        interaction.editReply({ 
            embeds: [
                new EmbedBuilder()
                    .setAuthor({ name: interaction.member.displayName, iconURL: interaction.member.displayAvatarURL() })
                    .setTitle(`${client.language({ textId: "Promocode used", guildId: interaction.guildId, locale: interaction.locale })}`)
                    .setDescription(`${client.language({ textId: "Received", guildId: interaction.guildId, locale: interaction.locale })}:\n${rewards.join("\n")}`)
                    .setColor(interaction.member.displayHexColor)
            ]
        })
        const achievements = client.cache.achievements.filter(e => e.guildID === interaction.guildId && e.enabled && e.type === AchievementType.UsedPromocodes)
        await Promise.all(achievements.map(async achievement => {
            if (!profile.achievements?.some(ach => ach.achievmentID === achievement.id) && profile.promocodesUsed >= achievement.amount && !client.tempAchievements[interaction.user.id]?.includes(achievement.id)) {
                if (!client.tempAchievements[interaction.user.id]) client.tempAchievements[interaction.user.id] = []
                client.tempAchievements[interaction.user.id].push(achievement.id)
                await profile.addAchievement(achievement, true)
            }    
        }))
        await profile.addQuestProgression("UsedPromocode", 1, promocode.code, true)
    }
}