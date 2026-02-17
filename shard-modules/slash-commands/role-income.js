const { EmbedBuilder, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, SnowflakeUtil, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorBuilder, MessageFlags, ContainerBuilder } = require("discord.js")
const UserRegexp = /usr{(.*?)}/
const lt = require('long-timeout')
module.exports = {
    name: 'role-income',
    nameLocalizations: {
        'ru': `роль-доход`,
        'uk': `дохід-від-ролі`,
        'es-ES': `ingresos-rol`
    },
    description: 'Get income from the role',
    descriptionLocalizations: {
        'ru': `Получить доход от роли`,
        'uk': `Отримати дохід від ролі`,
        'es-ES': `Obtener ingresos del rol`
    },
    dmPermission: false,
    group: `inventory-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.isButton() && interaction.user.id !== UserRegexp.exec(interaction.customId)?.[1]) return interaction.deferUpdate().catch(e => null)
        const profile = await client.functions.fetchProfile(client, interaction.user.id, interaction.guildId)
        if (interaction.isChatInputCommand()) await interaction.deferReply()
        else {
            await interaction.update({ 
                components: [
                    new TextDisplayBuilder().setContent(`### ⏳${client.language({ textId: "Loading", guildId: interaction.guildId, locale: interaction.locale })}`)
                ] 
            })
        }
        const member = await interaction.guild.members.fetch(interaction.user.id)
        const { income, pass, notification, totalIncome } = await profile.getIncome(interaction)
        if (!Object.keys(income).length) {
            return interaction.editReply({
                components: [
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${member.displayName}\n## ${client.language({ textId: "Role income", guildId: interaction.guildId, locale: interaction.locale })}`))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.displayAvatarURL())),
                    new SeparatorBuilder(),
                    new TextDisplayBuilder()
                        .setContent(`${client.config.emojis.NO} ${client.language({ textId: "No matching roles found. View all income roles", guildId: interaction.guildId, locale: interaction.locale })}: </roles:1150455842680885357>.`)
                ],
                flags: [MessageFlags.IsComponentsV2]
            })
        }
        let max = 100
        let totalLength = 0
        let message
        const container = new ContainerBuilder()
            .addSectionComponents([
                new SectionBuilder()
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${member.displayName}\n## ${client.language({ textId: "Role income", guildId: interaction.guildId, locale: interaction.locale })}`))
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(member.displayAvatarURL()))
            ])
            .addSeparatorComponents(new SeparatorBuilder())
            .addTextDisplayComponents([
                new TextDisplayBuilder()
                    .setContent(`${Object.keys(income).map((key, index) => {
                        if (income[key].cooldown) return `\`${index+1 < 10 ? 0 : ""}${index+1}\` — <@&${key}>: ${client.language({ textId: "next income", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(income[key].cooldown / 1000)}:R>`
                        else return `\`${index+1 < 10 ? 0 : ""}${index+1}\` — <@&${key}>: ${client.language({ textId: "next income", guildId: interaction.guildId, locale: interaction.locale })} <t:${Math.floor(profile.roleIncomeCooldowns.get(key) / 1000)}:R>\n${Object.values(income[key]).join("\n")}`
                    }).map((value, index) => {
                        if (totalLength < 4096) {
                            totalLength += value.length
                        }
                        if (totalLength > 4096) {
                            totalLength = 4096
                            max = index - 1
                        }
                        return value
                    }).slice(0, max).join("\n")}${Object.keys(income).length > max ? `\n ${client.language({ textId: "and more", guildId: interaction.guildId, locale: interaction.locale })} ${Object.keys(income).length - max}...` : ""}`.slice(0, 4096))
            ])
        if (totalIncome.length) {
            container
                .addSeparatorComponents(new SeparatorBuilder())
                .addSectionComponents([
                    new SectionBuilder()
                        .addTextDisplayComponents([
                            new TextDisplayBuilder()
                                .setContent(`## ${client.language({ textId: "Total received", guildId: interaction.guildId, locale: interaction.locale })}\n${totalIncome.join("\n")}`)
                        ])
                        .setButtonAccessory(
                            new ButtonBuilder()
                                .setCustomId(`cmd{inventory}usr{${interaction.user.id}}eph reply`)
                                .setEmoji(client.config.emojis.inventory)
                                .setLabel(client.language({ textId: "Inventory", guildId: interaction.guildId, locale: interaction.locale }))
                                .setStyle(ButtonStyle.Secondary)
                        )
                ])
        }
        message = await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2], allowedMentions: { roles: [] } })
        client.emit("economyLogCreate", interaction.guildId, `<@${interaction.user.id}> ${client.language({ textId: "received role income", guildId: interaction.guildId })}`)
        if (!pass || !notification) return
        lt.setTimeout(async () => {
            const nonce = SnowflakeUtil.generate().toString()
            await message.reply({ 
                components: [
                    new TextDisplayBuilder().setContent(`<@${member.user.id}>, ${client.language({ textId: "time to collect role income", guildId: interaction.guildId, locale: interaction.locale })}: </role-income:1150455842680885356>`),
                    new SeparatorBuilder(),
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Success)
                            .setLabel(`${client.language({ textId: "COLLECT INCOME", guildId: interaction.guildId, locale: interaction.locale })}`)
                            .setCustomId(`cmd{role-income}usr{${member.user.id}}`)
                    )
                ],
                flags: [MessageFlags.IsComponentsV2],
                allowedMentions: profile.roleIncomeMention ? { users: [member.user.id] } : { parse: [] },
                enforceNonce: true, nonce: nonce,
            }).catch(e => null)
        }, Math.min.apply(null, Array.from(profile.roleIncomeCooldowns.values()).map(value => value - Date.now()).filter(value => value > 0)))
    }
}