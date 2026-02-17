const { ApplicationCommandOptionType, StringSelectMenuBuilder, ActionRowBuilder, EmbedBuilder, Collection } = require("discord.js")
const RoleRegexp = /role{(.*?)}/
module.exports = {
    name: 'role-properties',
    nameLocalizations: {
        'ru': `роль-свойства`,
        'uk': `властивості-ролі`,
        'es-ES': `propiedades-rol`
    },
    description: 'Configure the properties for role',
    descriptionLocalizations: {
        'ru': `Настроить свойства для роли`,
        'uk': `Налаштувати властивості для ролі`,
        'es-ES': `Configurar las propiedades del rol`
    },
    options: [
        {
            name: 'role',
            nameLocalizations: {
                'ru': `роль`,
                'uk': `роль`,
                'es-ES': `rol`
            },
            description: 'The role for which you need to configure the properties',
            descriptionLocalizations: {
                'ru': `Роль, для которой нужно настроить свойства`,
                'uk': `Роль, для якої потрібно налаштувати властивості`,
                'es-ES': `Rol para el que necesitas configurar las propiedades`
            },
            type: ApplicationCommandOptionType.Role,
            required: true
        }
    ],
    defaultMemberPermissions: "Administrator",
    dmPermission: false,
    group: `admin-group`,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        const role = interaction.isChatInputCommand() ? interaction.guild.roles.cache.get(args.role) : interaction.guild.roles.cache.get(RoleRegexp.exec(interaction.customId)[1])
        let roleProperties = await client.rolePropertiesSchema.findOne({ id: role.id })
        if (interaction.isStringSelectMenu()) {
            if (!roleProperties) {
                roleProperties = new client.rolePropertiesSchema({
                    guildID: interaction.guildId,
                    id: role.id
                })
                await roleProperties.save()
            }
            roleProperties[interaction.values[0]] = !roleProperties[interaction.values[0]]
            if (!roleProperties.canUnwear && !roleProperties.cannotTransfer && !roleProperties.cannotSell && !roleProperties.cannotGiveaway && !roleProperties.cannotAuction) {
                await client.rolePropertiesSchema.deleteOne({ id: role.id })
                roleProperties = undefined
            }
            else await roleProperties.save()
        }
        const embed = new EmbedBuilder()
            .setTitle(`${client.language({ textId: "Role properties", guildId: interaction.guildId, locale: interaction.locale })} ${role.name}`)
            .setDescription([
                `${client.language({ textId: "Can be removed", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.canUnwear ? client.config.emojis.NO : client.config.emojis.YES}`,
                `${client.language({ textId: "Can be transferred", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotTransfer ? client.config.emojis.YES : client.config.emojis.NO}`,
                `${client.language({ textId: "Can be sold", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotSell ? client.config.emojis.YES : client.config.emojis.NO}`,
                `${client.language({ textId: "Can be given away", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotGiveaway ? client.config.emojis.YES : client.config.emojis.NO}`,
                `${client.language({ textId: "Can be sold at auction", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotAuction ? client.config.emojis.YES : client.config.emojis.NO}`,
            ].join("\n"))
            .setColor(3093046)
        const menu = new StringSelectMenuBuilder().setCustomId(`cmd{role-properties}role{${role.id}}`).setOptions([
            {
                label: `${client.language({ textId: "Can be removed", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.canUnwear ? `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                value: `canUnwear`
            },
            {
                label: `${client.language({ textId: "Can be transferred", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotTransfer ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                value: `cannotTransfer`
            },
            {
                label: `${client.language({ textId: "Can be sold", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotSell ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                value: `cannotSell`
            },
            {
                label: `${client.language({ textId: "Can be given away", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotGiveaway ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                value: `cannotGiveaway`
            },
            {
                label: `${client.language({ textId: "Can be sold at auction", guildId: interaction.guildId, locale: interaction.locale })}: ${!roleProperties || !roleProperties.cannotAuction ? `${client.language({ textId: "Yes", guildId: interaction.guildId, locale: interaction.locale })}` : `${client.language({ textId: "No", guildId: interaction.guildId, locale: interaction.locale })}`}`,
                value: `cannotAuction`
            }
        ])
        if (interaction.isChatInputCommand()) return interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: ["Ephemeral"] })
        else return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], flags: ["Ephemeral"] })
    }
}