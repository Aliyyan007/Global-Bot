const { EmbedBuilder, Collection } = require("discord.js")

const DEVELOPER_ID = "1345822697078395032"

module.exports = {
    name: 'bot-info',
    nameLocalizations: {
        'ru': 'бот-инфо',
        'uk': 'бот-інфо',
        'es-ES': 'bot-info'
    },
    description: 'Developer only - Display bot and server statistics',
    descriptionLocalizations: {
        'ru': 'Только для разработчика - Показать статистику бота и серверов',
        'uk': 'Тільки для розробника - Показати статистику бота та серверів',
        'es-ES': 'Solo desarrollador - Mostrar estadísticas del bot y servidores'
    },
    dmPermission: false,
    group: `admins-group`,
    defaultMemberPermissions: "Administrator",
    owner: true,
    guildOnly: true,
    devGuildId: "1345823526577246218",
    cooldowns: new Collection(),
    /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {String[]} args
     */
    run: async (client, interaction, args) => {
        // Developer only check
        if (interaction.user.id !== DEVELOPER_ID) {
            return interaction.reply({ 
                content: `${client.config.emojis.NO} You don't have permission to use this command.`, 
                flags: ["Ephemeral"] 
            })
        }

        await interaction.deferReply({ flags: ["Ephemeral"] })

        try {
            // Gather stats from all shards
            const shardData = await client.shard.broadcastEval(async (c) => {
                const guilds = c.guilds.cache.map(g => ({
                    id: g.id,
                    name: g.name,
                    memberCount: g.memberCount,
                    ownerId: g.ownerId,
                    createdAt: g.createdTimestamp,
                    joinedAt: g.joinedTimestamp,
                    icon: g.iconURL(),
                    boostLevel: g.premiumTier,
                    boostCount: g.premiumSubscriptionCount || 0
                }))
                
                return {
                    shardId: c.shard.ids[0],
                    status: c.ws.status,
                    ping: c.ws.ping,
                    guilds: guilds,
                    guildCount: c.guilds.cache.size,
                    userCount: c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
                    channelCount: c.channels.cache.size,
                    uptime: c.uptime,
                    memoryUsage: process.memoryUsage().heapUsed
                }
            })

            // Calculate totals
            const totalGuilds = shardData.reduce((acc, s) => acc + s.guildCount, 0)
            const totalUsers = shardData.reduce((acc, s) => acc + s.userCount, 0)
            const totalChannels = shardData.reduce((acc, s) => acc + s.channelCount, 0)
            const totalMemory = shardData.reduce((acc, s) => acc + s.memoryUsage, 0)
            const avgPing = Math.round(shardData.reduce((acc, s) => acc + s.ping, 0) / shardData.length)

            // Format uptime
            const uptime = shardData[0]?.uptime || 0
            const days = Math.floor(uptime / 86400000)
            const hours = Math.floor((uptime % 86400000) / 3600000)
            const minutes = Math.floor((uptime % 3600000) / 60000)
            const uptimeStr = `${days}d ${hours}h ${minutes}m`

            // Collect all guilds
            const allGuilds = shardData.flatMap(s => s.guilds)
            const sortedGuilds = allGuilds.sort((a, b) => b.memberCount - a.memberCount)

            // Calculate growth stats
            const now = Date.now()
            const oneDayAgo = now - 86400000
            const oneWeekAgo = now - 604800000
            const oneMonthAgo = now - 2592000000

            const guildsJoinedToday = allGuilds.filter(g => g.joinedAt > oneDayAgo).length
            const guildsJoinedThisWeek = allGuilds.filter(g => g.joinedAt > oneWeekAgo).length
            const guildsJoinedThisMonth = allGuilds.filter(g => g.joinedAt > oneMonthAgo).length

            // Server size distribution
            const tinyServers = allGuilds.filter(g => g.memberCount < 50).length
            const smallServers = allGuilds.filter(g => g.memberCount >= 50 && g.memberCount < 200).length
            const mediumServers = allGuilds.filter(g => g.memberCount >= 200 && g.memberCount < 1000).length
            const largeServers = allGuilds.filter(g => g.memberCount >= 1000 && g.memberCount < 5000).length
            const hugeServers = allGuilds.filter(g => g.memberCount >= 5000).length

            // Average members per server
            const avgMembers = Math.round(totalUsers / totalGuilds)

            // Command usage stats
            const commandsUses = await client.commandsUsesSchema.find().sort({"alltime.uses": -1})
            const alltimeUses = commandsUses.reduce((acc, cmd) => acc + cmd.alltime.uses, 0)
            const monthUses = commandsUses.reduce((acc, cmd) => acc + cmd.monthly.uses, 0)
            const weekUses = commandsUses.reduce((acc, cmd) => acc + cmd.weekly.uses, 0)
            const dayUses = commandsUses.reduce((acc, cmd) => acc + cmd.daily.uses, 0)
            const hourUses = commandsUses.reduce((acc, cmd) => acc + cmd.hourly.uses, 0)

            // Top 5 commands
            const top5Commands = commandsUses.slice(0, 5).map((cmd, i) => 
                `${i + 1}. \`/${cmd.commandName}\` — ${cmd.alltime.uses.toLocaleString()}`
            ).join('\n')

            // Bot info embed
            const botEmbed = new EmbedBuilder()
                .setColor("#2F3236")
                .setTitle(`${client.config.emojis.gear} Bot Overview`)
                .setThumbnail(client.user.avatarURL())
                .addFields([
                    { name: `${client.config.emojis.statistics} Servers`, value: `${totalGuilds}`, inline: true },
                    { name: `${client.config.emojis.profile2users} Users`, value: `${totalUsers.toLocaleString()}`, inline: true },
                    { name: `${client.config.emojis.message} Channels`, value: `${totalChannels.toLocaleString()}`, inline: true },
                    { name: `${client.config.emojis.watch} Uptime`, value: uptimeStr, inline: true },
                    { name: `${client.config.emojis.reload} Ping`, value: `${avgPing}ms`, inline: true },
                    { name: `${client.config.emojis.box} Memory`, value: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`, inline: true },
                    { name: `${client.config.emojis.numbersign} Shards`, value: `${shardData.length}`, inline: true },
                    { name: `${client.config.emojis.profile2users} Avg/Server`, value: `${avgMembers}`, inline: true }
                ])
                .setTimestamp()

            // Growth & Activity embed
            const growthEmbed = new EmbedBuilder()
                .setColor("#3EB489")
                .setTitle(`${client.config.emojis.UP} Growth & Activity`)
                .addFields([
                    { name: '📈 Server Growth', value: `Today: **+${guildsJoinedToday}**\nThis Week: **+${guildsJoinedThisWeek}**\nThis Month: **+${guildsJoinedThisMonth}**`, inline: true },
                    { name: '📊 Server Sizes', value: `<50: **${tinyServers}**\n50-200: **${smallServers}**\n200-1K: **${mediumServers}**\n1K-5K: **${largeServers}**\n5K+: **${hugeServers}**`, inline: true },
                    { name: `${client.config.emojis.game} Command Usage`, value: `All Time: **${alltimeUses.toLocaleString()}**\nThis Month: **${monthUses.toLocaleString()}**\nThis Week: **${weekUses.toLocaleString()}**\nToday: **${dayUses.toLocaleString()}**\nThis Hour: **${hourUses.toLocaleString()}**`, inline: true }
                ])

            // Top commands embed
            const commandsEmbed = new EmbedBuilder()
                .setColor("#FFD700")
                .setTitle(`${client.config.emojis.top} Top 5 Commands`)
                .setDescription(top5Commands || 'No command data available')

            // Shard status embed
            const shardStatusLines = shardData.map(s => {
                const statusEmoji = s.status === 0 ? '🟢' : s.status === 5 ? '🔴' : '🟡'
                const mem = (s.memoryUsage / 1024 / 1024).toFixed(1)
                return `\`Shard ${s.shardId}\` ${statusEmoji} ${s.ping}ms | ${s.guildCount} servers | ${mem}MB`
            })

            const shardEmbed = new EmbedBuilder()
                .setColor("#2F3236")
                .setTitle(`${client.config.emojis.statistics} Shard Status`)
                .setDescription(shardStatusLines.join('\n'))

            // Top servers embed
            const topGuilds = sortedGuilds.slice(0, 15)
            const serverLines = topGuilds.map((g, i) => {
                const joinDate = new Date(g.joinedAt).toLocaleDateString()
                const boostInfo = g.boostCount > 0 ? ` | 💎${g.boostCount}` : ''
                return `**${i + 1}.** ${g.name}\n└ \`${g.id}\` | 👥 ${g.memberCount.toLocaleString()}${boostInfo} | 📅 ${joinDate}`
            })

            const serverEmbed = new EmbedBuilder()
                .setColor("#2F3236")
                .setTitle(`${client.config.emojis.crown} Top ${topGuilds.length} Servers`)
                .setDescription(serverLines.join('\n'))
                .setFooter({ text: `Total: ${totalGuilds} servers` })

            await interaction.editReply({ 
                embeds: [botEmbed, growthEmbed, commandsEmbed, shardEmbed, serverEmbed] 
            })

        } catch (error) {
            console.error('Bot-info command error:', error)
            await interaction.editReply({ 
                content: `${client.config.emojis.NO} An error occurred: ${error.message}` 
            })
        }
    }
}
