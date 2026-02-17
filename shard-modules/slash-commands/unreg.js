const { ApplicationCommandOptionType, Collection } = require("discord.js")
module.exports = {
    name: 'unreg',
    description: 'Unregister commands',
    descriptionLocalizations: {
        'ru': `Отменить регистрацию команд`
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
    /**
     *
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        if (interaction.user.id !== client.config.discord.ownerId) return interaction.reply({ content: `${client.language({ textId: "You don't have permission to use this command", guildId: interaction.guildId, locale: interaction.locale })}`, flags: ["Ephemeral"] })
        await interaction.deferReply({ flags: ["Ephemeral"] })
        if (args.command_name) {
            if (args.guild_id) {
                const guild = client.guilds.cache.get(args.guild_id)
                if (guild) {
                    command = await guild.commands.fetch().then(commands => commands.find(e => e.name === args.command_name))
                    await command.delete()
                    return interaction.editReply({ content: `Command **/${args.command_name}** was successfully deleted on server ${guild.name} (${guild.id}).`, flags: ["Ephemeral"] })    
                } else return interaction.editReply({ content: `Server with ID ${args.guild_id} not found`, flags: ["Ephemeral"] })
            } else {
                command = await client.application.commands.fetch().then(commands => commands.find(e => e.name === args.command_name))
                if (!command) return interaction.editReply({ content: `Command **/${args.command_name}** was not found.`, flags: ["Ephemeral"]})
                await command.delete()
                return interaction.editReply({ content: `Command **/${args.command_name}** was successfully deleted globally.`, flags: ["Ephemeral"]})
            }
        } else {
            if (args.guild_id) {
                const guild = client.guilds.cache.get(args.guild_id)
                if (guild) {
                    await client.application.commands.set([], args.guild_id)
                    return interaction.editReply({ content: `**ALL** commands were successfully deleted on server ${guild.name} (${guild.id}).`, flags: ["Ephemeral"] })    
                } else return interaction.editReply({ content: `Server with ID ${args.guild_id} not found`, flags: ["Ephemeral"] })
            } else {
                await client.application.commands.set([])
                return interaction.editReply({ content: `**ALL** commands were successfully deleted globally.`, flags: ["Ephemeral"]})
            }
        }
    }
}