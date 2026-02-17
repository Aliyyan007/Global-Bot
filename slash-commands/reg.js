const { ApplicationCommandType, ApplicationCommandOptionType, Collection } = require("discord.js")
const { glob } = require("glob")
module.exports = {
    name: 'reg',
    description: 'Register commands',
    descriptionLocalizations: {
        'ru': `Зарегистрировать команды`
    },
    options: [
        {
            name: 'command_name',
            description: 'Command name',
            type: ApplicationCommandOptionType.String,
            required: false,
            autocomplete: true
        },
        {
            name: 'guild_id',
            description: 'Guild ID',
            type: ApplicationCommandOptionType.String,
            required: false
        }
    ],
    dmPermission: true,
    defaultMemberPermissions: "Administrator",
    owner: true,
    cooldowns: new Collection(),
    run: async (client, interaction, args) => {
        if (interaction.user.id !== client.config.discord.ownerId) return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        await interaction.deferReply({ flags: ["Ephemeral"] })
        if (args.command_name) {
            const value = glob.sync(`slash-commands/${args.command_name}.js`, {
                absolute: true
            })
            let command = require(value[0])
            if ([ApplicationCommandType.Message, ApplicationCommandType.User].includes(command.type)) {
                delete command.description
                delete command.options
            }
            if (args.guild_id) {
                const guild = client.guilds.cache.get(args.guild_id)
                if (guild) {
                    try {
                        command = await client.application.commands.create(command, args.guild_id)
                    } catch (err) {
                        return interaction.editReply({ content: err.message, flags: ["Ephemeral"]})
                    }
                    return interaction.editReply({ content: `Command </${command.name}:${command.id}> was successfully registered on server ${guild.name} (${guild.id}).`, flags: ["Ephemeral"] })    
                } else return interaction.editReply({ content: `Server with ID ${args.guild_id} not found`, flags: ["Ephemeral"] })
            } else {
                try {
                    command = await client.application.commands.create(command)
                } catch (err) {
                    return interaction.editReply({ content: err.message, flags: ["Ephemeral"]})
                }
                return interaction.editReply({ content: `Command </${command.name}:${command.id}> was successfully registered globally.`, flags: ["Ephemeral"]})
            }
        } else {
            const files = glob.sync(`slash-commands/*.js`, {
                absolute: true
            })
            const arrayOfSlashCommands = []
            await files.map(async (value) => {
                const file = require(value)
                if (!file?.name) return
                if ([ApplicationCommandType.Message, ApplicationCommandType.User].includes(file.type)) {
                    delete file.description
                    delete file.options
                }
                let newMap = Object.assign({}, file)
                arrayOfSlashCommands.push(newMap)
            })
            if (args.guild_id) {
                const guild = client.guilds.cache.get(args.guild_id)
                if (guild) {
                    const commands = await client.application.commands.set(arrayOfSlashCommands.filter(e => !e.owner), args.guild_id)
                    return interaction.editReply({ content: `**${commands.size}** commands were successfully registered on server ${guild.name} (${guild.id}).`, flags: ["Ephemeral"] })    
                } else return interaction.editReply({ content: `Server with ID ${args.guild_id} not found`, flags: ["Ephemeral"] })
            } else {
                const commands = await client.application.commands.set(arrayOfSlashCommands.filter(e => !e.owner))
                return interaction.editReply({ content: `**${commands.size}** commands were successfully registered globally.`, flags: ["Ephemeral"]})
            }
        }
    }
}