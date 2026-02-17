const { ApplicationCommandOptionType, Collection } = require("discord.js")
const amountRegexp = /amount{(.*?)}/
const itemRegexp = /item{(.*?)}/
const userRegexp = /usr{(.*?)}/
const loading = new Collection()
module.exports = {
    name: 'take-item',
    nameLocalizations: {
        'ru': `забрать-предмет`,
        'uk': `забрати-предмет`,
        'es-ES': `quitar-objeto`
    },
    description: 'Take an item',
    descriptionLocalizations: {
        'ru': `Забрать предмет`,
        'uk': `Забрати предмет`,
        'es-ES': `Quitar un objeto`
    },
    options: [
        {
            name: 'from-member',
            nameLocalizations: {
                'ru': `у-участника`,
                'uk': `у-учасника`,
                'es-ES': `de-miembro`
            },
            description: 'Take item from member',
            descriptionLocalizations: {
                'ru': `Забрать предмет у участника`,
                'uk': `Забрати предмет у учасника`,
                'es-ES': `Quitar objeto de un miembro`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'user',
                    nameLocalizations: {
                        'ru': `юзер`,
                        'uk': `користувач`,
                        'es-ES': `usuario`
                    },
                    description: 'First user to take an item',
                    descriptionLocalizations: {
                        'ru': `Первый пользователь для удаления предмета`,
                        'uk': `Перший користувач для видалення предмету`,
                        'es-ES': `Primer usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: 'item',
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
                        'es-ES': `objeto`
                    },
                    description: 'Name of item to take',
                    descriptionLocalizations: {
                        'ru': `Имя предмета для удаления`,
                        'uk': `Назва предмету для видалення`,
                        'es-ES': `Nombre del objeto a quitar`
                    },
                    minLength: 2,
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `количество`,
                        'uk': `кількість`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of items to take',
                    descriptionLocalizations: {
                        'ru': `Количество предметов для удаления`,
                        'uk': `Кількість предметів для видалення`,
                        'es-ES': `Cantidad de objetos a quitar`
                    },
                    type: ApplicationCommandOptionType.Number,
                    required: false,
                    min_value: 0.01,
                    max_value: 1000000000
                },
                {
                    name: 'user2',
                    nameLocalizations: {
                        'ru': `юзер2`,
                        'uk': `користувач2`,
                        'es-ES': `usuario2`
                    },
                    description: 'Second user to take an item',
                    descriptionLocalizations: {
                        'ru': `Второй пользователь для удаления предмета`,
                        'uk': `Другий користувач для видалення предмету`,
                        'es-ES': `Segundo usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user3',
                    nameLocalizations: {
                        'ru': `юзер3`,
                        'uk': `користувач3`,
                        'es-ES': `usuario3`
                    },
                    description: 'Third user to take an item',
                    descriptionLocalizations: {
                        'ru': `Третий пользователь для удаления предмета`,
                        'uk': `Третій користувач для видалення предмету`,
                        'es-ES': `Tercer usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user4',
                    nameLocalizations: {
                        'ru': `юзер4`,
                        'uk': `користувач4`,
                        'es-ES': `usuario4`
                    },
                    description: 'Fourth user to take an item',
                    descriptionLocalizations: {
                        'ru': `Четвертый пользователь для удаления предмета`,
                        'uk': `Четвертий користувач для видалення предмету`,
                        'es-ES': `Cuarto usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user5',
                    nameLocalizations: {
                        'ru': `юзер5`,
                        'uk': `користувач5`,
                        'es-ES': `usuario5`
                    },
                    description: 'Fifth user to take an item',
                    descriptionLocalizations: {
                        'ru': `Пятый пользователь для удаления предмета`,
                        'uk': `П'ятий користувач для видалення предмету`,
                        'es-ES': `Quinto usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user6',
                    nameLocalizations: {
                        'ru': `юзер6`,
                        'uk': `користувач6`,
                        'es-ES': `usuario6`
                    },
                    description: 'Sixth user to take an item',
                    descriptionLocalizations: {
                        'ru': `Шестой пользователь для удаления предмета`,
                        'uk': `Шостий користувач для видалення предмету`,
                        'es-ES': `Sexto usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user7',
                    nameLocalizations: {
                        'ru': `юзер7`,
                        'uk': `користувач7`,
                        'es-ES': `usuario7`
                    },
                    description: 'Seventh user to take an item',
                    descriptionLocalizations: {
                        'ru': `Седьмой пользователь для удаления предмета`,
                        'uk': `Сьомий користувач для видалення предмету`,
                        'es-ES': `Séptimo usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user8',
                    nameLocalizations: {
                        'ru': `юзер8`,
                        'uk': `користувач8`,
                        'es-ES': `usuario8`
                    },
                    description: 'Eighth user to take an item',
                    descriptionLocalizations: {
                        'ru': `Восьмой пользователь для удаления предмета`,
                        'uk': `Восьмий користувач для видалення предмету`,
                        'es-ES': `Octavo usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user9',
                    nameLocalizations: {
                        'ru': `юзер9`,
                        'uk': `користувач9`,
                        'es-ES': `usuario9`
                    },
                    description: 'Ninth user to take an item',
                    descriptionLocalizations: {
                        'ru': `Девятый пользователь для удаления предмета`,
                        'uk': `Дев'ятий користувач для видалення предмету`,
                        'es-ES': `Noveno usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
                {
                    name: 'user10',
                    nameLocalizations: {
                        'ru': `юзер10`,
                        'uk': `користувач10`,
                        'es-ES': `usuario10`
                    },
                    description: 'Tenth user to take an item',
                    descriptionLocalizations: {
                        'ru': `Десятый пользователь для удаления предмета`,
                        'uk': `Десятий користувач для видалення предмету`,
                        'es-ES': `Décimo usuario para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.User,
                    required: false
                },
            ]
        },
        {
            name: 'from-role',
            nameLocalizations: {
                'ru': `у-роли`,
                'uk': `у-ролі`,
                'es-ES': `de-rol`
            },
            description: 'take item from role',
            descriptionLocalizations: {
                'ru': `Забрать предмет у роли`,
                'uk': `Забрати предмет у ролі`,
                'es-ES': `Quitar objeto de un rol`
            },
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'role',
                    nameLocalizations: {
                        'ru': `роль`,
                        'uk': `роль`,
                        'es-ES': `rol`
                    },
                    description: 'First role to take an item',
                    descriptionLocalizations: {
                        'ru': `Первая роль для удаления предмета`,
                        'uk': `Перша роль для видалення предмету`,
                        'es-ES': `Primer rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: true
                },
                {
                    name: 'item',
                    nameLocalizations: {
                        'ru': `предмет`,
                        'uk': `предмет`,
                        'es-ES': `objeto`
                    },
                    description: 'Name of item to take',
                    descriptionLocalizations: {
                        'ru': `Имя предмета для удаления`,
                        'uk': `Назва предмету для видалення`,
                        'es-ES': `Nombre del objeto a quitar`
                    },
                    minLength: 2,
                    type: ApplicationCommandOptionType.String,
                    required: true,
                    autocomplete: true
                },
                {
                    name: 'amount',
                    nameLocalizations: {
                        'ru': `количество`,
                        'uk': `кількість`,
                        'es-ES': `cantidad`
                    },
                    description: 'Amount of items to take',
                    descriptionLocalizations: {
                        'ru': `Количество предметов для удаления`,
                        'uk': `Кількість предметів для видалення`,
                        'es-ES': `Cantidad de objetos a quitar`
                    },
                    type: ApplicationCommandOptionType.Number,
                    required: false,
                    min_value: 0.01,
                    max_value: 1000000000
                },
                {
                    name: 'role2',
                    nameLocalizations: {
                        'ru': `роль2`,
                        'uk': `роль2`,
                        'es-ES': `rol2`
                    },
                    description: 'Second role to take an item',
                    descriptionLocalizations: {
                        'ru': `Вторая роль для удаления предмета`,
                        'uk': `Друга роль для видалення предмету`,
                        'es-ES': `Segundo rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role3',
                    nameLocalizations: {
                        'ru': `роль3`,
                        'uk': `роль3`,
                        'es-ES': `rol3`
                    },
                    description: 'Third role to take an item',
                    descriptionLocalizations: {
                        'ru': `Третья роль для удаления предмета`,
                        'uk': `Третя роль для видалення предмету`,
                        'es-ES': `Tercer rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role4',
                    nameLocalizations: {
                        'ru': `роль4`,
                        'uk': `роль4`,
                        'es-ES': `rol4`
                    },
                    description: 'Fourth role to take an item',
                    descriptionLocalizations: {
                        'ru': `Четвертая роль для удаления предмета`,
                        'uk': `Четверта роль для видалення предмету`,
                        'es-ES': `Cuarto rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role5',
                    nameLocalizations: {
                        'ru': `роль5`,
                        'uk': `роль5`,
                        'es-ES': `rol5`
                    },
                    description: 'Fifth role to take an item',
                    descriptionLocalizations: {
                        'ru': `Пятая роль для удаления предмета`,
                        'uk': `П'ята роль для видалення предмету`,
                        'es-ES': `Quinto rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role6',
                    nameLocalizations: {
                        'ru': `роль6`,
                        'uk': `роль6`,
                        'es-ES': `rol6`
                    },
                    description: 'Sixth role to take an item',
                    descriptionLocalizations: {
                        'ru': `Шестая роль для удаления предмета`,
                        'uk': `Шоста роль для видалення предмету`,
                        'es-ES': `Sexto rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role7',
                    nameLocalizations: {
                        'ru': `роль7`,
                        'uk': `роль7`,
                        'es-ES': `rol7`
                    },
                    description: 'Seventh role to take an item',
                    descriptionLocalizations: {
                        'ru': `Седьмая роль для удаления предмета`,
                        'uk': `Сьома роль для видалення предмету`,
                        'es-ES': `Séptimo rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role8',
                    nameLocalizations: {
                        'ru': `роль8`,
                        'uk': `роль8`,
                        'es-ES': `rol8`
                    },
                    description: 'Eighth role to take an item',
                    descriptionLocalizations: {
                        'ru': `Восьмая роль для удаления предмета`,
                        'uk': `Восьма роль для видалення предмету`,
                        'es-ES': `Octavo rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role9',
                    nameLocalizations: {
                        'ru': `роль9`,
                        'uk': `роль9`,
                        'es-ES': `rol9`
                    },
                    description: 'Ninth role to take an item',
                    descriptionLocalizations: {
                        'ru': `Девятая роль для удаления предмета`,
                        'uk': `Дев'ята роль для видалення предмету`,
                        'es-ES': `Noveno rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: 'role10',
                    nameLocalizations: {
                        'ru': `роль10`,
                        'uk': `роль10`,
                        'es-ES': `rol10`
                    },
                    description: 'Tenth role to take an item',
                    descriptionLocalizations: {
                        'ru': `Десятая роль для удаления предмета`,
                        'uk': `Десята роль для видалення предмету`,
                        'es-ES': `Décimo rol para quitar objeto`
                    },
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
            ]
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
        if (interaction.isButton()) {
            args = {}
            args.Subcommand = "from-member"
            if (!userRegexp.exec(interaction.customId)) args.user = interaction.user.id
            else args.user = userRegexp.exec(interaction.customId)[1]
            if (!amountRegexp.exec(interaction.customId)) args.amount = 1
            else args.amount = +amountRegexp.exec(interaction.customId)[1]
            const itemName = client.cache.items.get(itemRegexp.exec(interaction.customId)[1])?.name
            if (!itemName) return interaction.reply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Item not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] }) 
            args.item = itemName
            await interaction.deferReply({ flags: ["Ephemeral"] })
        } else await interaction.deferReply({ flags: ["Ephemeral"] })
        let amount = !args?.amount || args?.amount < 0 ? 1 : args?.amount ? args?.amount : 1
        if (amount > 1000000000) amount = 1000000000
        if (args.item.length < 2) {
            return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "Query contains less than two characters", guildId: interaction.guildId, locale: interaction.locale })}` })  
        }
        const filteredItems = client.cache.items.filter(e => e.guildID === interaction.guildId && !e.temp && e.enabled && e.name.toLowerCase().includes(args.item.toLowerCase()))
        if (filteredItems.size > 1 && !filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase())) {
            let result = ""
            filteredItems.forEach(item => {
                result += `> ${item.displayEmoji}**${item.name}**\n`
            })
            return interaction.editReply({ content: `${client.config.emojis.stop} ${client.language({ textId: "Multiple items found for your query", guildId: interaction.guildId, locale: interaction.locale })}:\n${result}` })
        }
        const item = filteredItems.some(e => e.name.toLowerCase() == args.item.toLowerCase()) ? filteredItems.find(e => e.name.toLowerCase() == args.item.toLowerCase()) : filteredItems.first()
        if (!item) return interaction.editReply({ content: `${client.config.emojis.NO} ${client.language({ textId: "This item does not exist", guildId: interaction.guildId, locale: interaction.locale })}.` })
        if (args.Subcommand === "from-member") {
            const users = []
            users.push(args.user)
            if (args.user2) users.push(args.user2)
            if (args.user3) users.push(args.user3)
            if (args.user4) users.push(args.user4)
            if (args.user5) users.push(args.user5)
            if (args.user6) users.push(args.user6)
            if (args.user7) users.push(args.user7)
            if (args.user8) users.push(args.user8)
            if (args.user9) users.push(args.user9)
            if (args.user10) users.push(args.user10)
            await interaction.editReply({ content: `${client.language({ textId: "Taking items", guildId: interaction.guildId, locale: interaction.locale })}...`, flags: ["Ephemeral"] })
            for (let user of users) {
                const member = await interaction.guild.members.fetch(user).catch(e => null)
                if (member) {
                    if (!member.user.bot) {
                        const profile = await client.functions.fetchProfile(client, member.user.id, interaction.guildId)
                        await profile.subtractItem(item.itemID, amount)
                        interaction.followUp({ content: `${client.config.emojis.DONE} ${client.language({ textId: "Item", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}${item.name} (${amount}) ${client.language({ textId: "was successfully removed from user", guildId: interaction.guildId, locale: interaction.locale })} <@${member.user.id}>.` })  
                    } else interaction.followUp({ content: `${client.config.emojis.NO} <@${member.user.id}> ${client.language({ textId: "is a bot, cannot interact with bots", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
                } else interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "User with ID", guildId: interaction.guildId, locale: interaction.locale })} ${user} ${client.language({ textId: "was not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            }
            return interaction.editReply({ content: `${client.config.emojis.YES} ${client.language({ textId: "Item removal completed!", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })    
        }
        if (args.Subcommand === "from-role") {
            if (loading.has(interaction.guildId)) {
                const process = loading.get(interaction.guildId)
                return interaction.editReply({ content: `→ ${client.language({ textId: "Removal process already in progress", guildId: interaction.guildId, locale: interaction.locale })} ${process.first().item}\n${process.map(e => `${e.count === e.membersSize ? client.config.emojis.YES : "⏳"} <@&${e.id}> (\`${e.count}\`/${e.membersSize === undefined ? "⏳" : `\`${e.membersSize}\``} \`${e.membersSize !== undefined ? Math.floor(e.count/e.membersSize*100) : 0}%\`)`).join("\n")}` })
            }
            const roles = []
            roles.push(args.role)
            if (args.role2) roles.push(args.role2)
            if (args.role3) roles.push(args.role3)
            if (args.role4) roles.push(args.role4)
            if (args.role5) roles.push(args.role5)
            if (args.role6) roles.push(args.role6)
            if (args.role7) roles.push(args.role7)
            if (args.role8) roles.push(args.role8)
            if (args.role9) roles.push(args.role9)
            if (args.role10) roles.push(args.role10)
            loading.set(interaction.guildId, new Collection())
            let content = [
                `→ ${client.language({ textId: "Taking", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** (${amount})`,
            ]
            roles.forEach(id => {
                loading.get(interaction.guildId).set(id, { id: id, count: 0, membersSize: undefined, item: `${item.displayEmoji}**${item.name}** (${amount})` })
                content.push(`⏳ <@&${id}> (\`0\`/⏳ \`0%\`)`)
            })
            await interaction.editReply({ content: content.join("\n"), flags: ["Ephemeral"] })
            if (!client.fetchedMembers.has(interaction.guildId)) {
                await interaction.guild.members.fetch()
                client.fetchedMembers.add(interaction.guildId)
            }
            for (let role of roles) {
                role = await interaction.guild.roles.fetch(role).catch(e => null)
                if (role) {
                    const members = role.members.filter(member => !member.user.bot)
                    const rol = loading.get(interaction.guildId).get(role.id)
                    rol.membersSize = members.size
                    loading.get(interaction.guildId).set(role.id, rol)
                    let last = Math.floor(rol.count/rol.membersSize*100)
                    for (const member of members) {
                        const profile = await client.functions.fetchProfile(client, member[1].user.id, interaction.guildId)
                        await profile.subtractItem(item.itemID, amount)
                        const rol = loading.get(interaction.guildId).get(role.id)
                        rol.count++
                        loading.get(interaction.guildId).set(role.id, rol)
                        if (Math.floor(rol.count/rol.membersSize*100) !== last && Math.floor(rol.count/rol.membersSize*100) % 10 === 0) {
                            await interaction.editReply({ content: `→ ${client.language({ textId: "Taking", guildId: interaction.guildId, locale: interaction.locale })} ${item.displayEmoji}**${item.name}** (${amount})\n${loading.get(interaction.guildId).map(e => `${e.count === e.membersSize ? client.config.emojis.YES : "⏳"} <@&${e.id}> (\`${e.count}\`/${e.membersSize === undefined ? "⏳" : `\`${e.membersSize}\``} \`${e.membersSize !== undefined ? Math.floor(e.count/e.membersSize*100) : 0}%\`)`).join("\n")}` })    
                        }
                    }
                } else interaction.followUp({ content: `${client.config.emojis.NO} ${client.language({ textId: "Role with ID", guildId: interaction.guildId, locale: interaction.locale })} ${user} ${client.language({ textId: "was not found", guildId: interaction.guildId, locale: interaction.locale })}.`, flags: ["Ephemeral"] })  
            }
            loading.delete(interaction.guildId)   
        }
    }
}