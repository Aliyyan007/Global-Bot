const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, Collection } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')

const commandBuilder = new SlashCommandBuilder()
        .setName('emoji-sticker-backup')
        .setDescription('Manage emoji and sticker backup system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check backup system status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View backup statistics for this server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cache-all')
                .setDescription('Manually cache all emojis and stickers (admin only)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('health-check')
                .setDescription('Run system health check')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('pending-cleanups')
                .setDescription('View pending backup cleanups')
        )

module.exports = {
    ...commandBuilder.toJSON(),
    group: 'admins-group',
    cooldowns: new Collection(),

    async run(client, interaction) {
        // Guild-only command validation
        if (!interaction.guild) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Guild Only')
                        .setDescription('This command can only be used in servers.')
                ],
                ephemeral: true
            })
        }

        // Handler availability check
        if (!client.emojiStickerCache || !client.emojiStickerProtection) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ System Not Available')
                        .setDescription('Emoji/Sticker backup system is not initialized.')
                ],
                ephemeral: true
            })
        }

        const subcommand = interaction.options.getSubcommand()
        
        // Check if Safe Moderation is enabled
        const config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
        if (!config || !config.enabled) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('❌ Safe Moderation Required')
                        .setDescription('Emoji/Sticker backup requires Safe Moderation to be enabled.\n\nUse `/safe-moderation setup` first.')
                ],
                ephemeral: true
            })
        }

        switch (subcommand) {
            case 'status':
                await handleStatus(interaction, client)
                break
            case 'stats':
                await handleStats(interaction, client)
                break
            case 'cache-all':
                await handleCacheAll(interaction, client)
                break
            case 'health-check':
                await handleHealthCheck(interaction, client)
                break
            case 'pending-cleanups':
                await handlePendingCleanups(interaction, client)
                break
        }
    }
}

async function handleStatus(interaction, client) {
    try {
        const health = await client.emojiStickerCache.healthCheck()
        
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Emoji/Sticker Backup Status')
            .setColor(health.initialized ? 0x00FF00 : 0xFFA500)
            .addFields(
                { 
                    name: '🔧 System Status', 
                    value: health.initialized ? '✅ Initialized' : '⚠️ Not Initialized',
                    inline: true 
                },
                { 
                    name: '☁️ B2 Storage', 
                    value: health.b2Storage.status === 'healthy' ? '✅ Connected' : 
                           health.b2Storage.status === 'not_configured' ? '⚠️ Not Configured' : 
                           '❌ Error',
                    inline: true 
                },
                { 
                    name: '🗄️ Backup Database', 
                    value: health.database.connected ? '✅ Connected' : 
                           !health.database.configured ? '⚠️ Not Configured' : 
                           '❌ Disconnected',
                    inline: true 
                }
            )
            .setTimestamp()
        
        if (health.b2Storage.status !== 'healthy') {
            embed.addFields({
                name: '⚠️ B2 Storage Issue',
                value: health.b2Storage.message,
                inline: false
            })
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
    } catch (error) {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Error')
                    .setDescription(`Failed to check status: ${error.message}`)
            ],
            ephemeral: true
        })
    }
}
async function handleStats(interaction, client) {
    try {
        const stats = await client.emojiStickerCache.getCacheStats(interaction.guild.id)
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Backup Statistics')
            .setColor(0x0099FF)
            .addFields(
                { name: '😀 Cached Emojis', value: stats.emojis.toString(), inline: true },
                { name: '🎭 Cached Stickers', value: stats.stickers.toString(), inline: true },
                { name: '💾 Total Storage', value: `${stats.totalSizeMB} MB`, inline: true }
            )
            .setFooter({ text: `Guild: ${interaction.guild.name}` })
            .setTimestamp()
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
    } catch (error) {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Error')
                    .setDescription(`Failed to get statistics: ${error.message}`)
            ],
            ephemeral: true
        })
    }
}

async function handleCacheAll(interaction, client) {
    await interaction.deferReply({ ephemeral: true })
    
    try {
        const startTime = Date.now()
        
        // Fetch all emojis and stickers
        const emojis = await interaction.guild.emojis.fetch()
        const stickers = await interaction.guild.stickers.fetch()
        
        // Cache them
        const emojiCount = await client.emojiStickerCache.batchCacheEmojis(emojis, interaction.guild.id)
        const stickerCount = await client.emojiStickerCache.batchCacheStickers(stickers, interaction.guild.id)
        
        const elapsed = Date.now() - startTime
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Manual Cache Complete')
            .setColor(0x00FF00)
            .addFields(
                { name: '😀 Emojis Cached', value: `${emojiCount}/${emojis.size}`, inline: true },
                { name: '🎭 Stickers Cached', value: `${stickerCount}/${stickers.size}`, inline: true },
                { name: '⏱️ Time Taken', value: `${elapsed}ms`, inline: true }
            )
            .setTimestamp()
        
        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Error')
                    .setDescription(`Failed to cache resources: ${error.message}`)
            ]
        })
    }
}

async function handleHealthCheck(interaction, client) {
    await interaction.deferReply({ ephemeral: true })
    
    try {
        const cacheHealth = await client.emojiStickerCache.healthCheck()
        const protectionHealth = await client.emojiStickerProtection.healthCheck()
        
        const embed = new EmbedBuilder()
            .setTitle('🏥 System Health Check')
            .setColor(0x0099FF)
            .addFields(
                { 
                    name: '🔧 Cache Handler', 
                    value: cacheHealth.initialized ? '✅ Healthy' : '⚠️ Not Initialized',
                    inline: true 
                },
                { 
                    name: '🛡️ Protection Handler', 
                    value: '✅ Healthy',
                    inline: true 
                },
                { 
                    name: '☁️ B2 Storage', 
                    value: cacheHealth.b2Storage.status === 'healthy' ? '✅ Healthy' : 
                           cacheHealth.b2Storage.status === 'not_configured' ? '⚠️ Not Configured' : 
                           '❌ Error',
                    inline: true 
                },
                { 
                    name: '🗄️ Backup Database', 
                    value: cacheHealth.database.connected ? '✅ Connected' : 
                           !cacheHealth.database.configured ? '⚠️ Not Configured' : 
                           '❌ Disconnected',
                    inline: true 
                }
            )
            .setTimestamp()
        
        // Add detailed status messages
        if (cacheHealth.b2Storage.status !== 'healthy') {
            embed.addFields({
                name: '☁️ B2 Storage Details',
                value: cacheHealth.b2Storage.message,
                inline: false
            })
        }
        
        if (protectionHealth.b2Storage.status !== 'healthy') {
            embed.addFields({
                name: '🛡️ Protection B2 Details',
                value: protectionHealth.b2Storage.message,
                inline: false
            })
        }
        
        await interaction.editReply({ embeds: [embed] })
    } catch (error) {
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Health Check Failed')
                    .setDescription(`Error: ${error.message}`)
            ]
        })
    }
}
async function handlePendingCleanups(interaction, client) {
    try {
        const pendingCleanups = client.backupCleanupScheduler?.getPendingCleanups() || []
        
        const embed = new EmbedBuilder()
            .setTitle('🗑️ Pending Backup Cleanups')
            .setColor(0xFFA500)
            .setTimestamp()
        
        if (pendingCleanups.length === 0) {
            embed.setDescription('✅ No pending cleanups scheduled')
        } else {
            embed.setDescription(`⏰ ${pendingCleanups.length} cleanup(s) scheduled`)
            
            const cleanupList = pendingCleanups.map(guildId => {
                const guild = client.guilds.cache.get(guildId)
                return `• ${guild?.name || 'Unknown Guild'} (\`${guildId}\`)`
            }).join('\n')
            
            embed.addFields({
                name: 'Scheduled Cleanups (10 minutes after bot removal)',
                value: cleanupList.length > 1024 ? `${cleanupList.substring(0, 1000)}...` : cleanupList,
                inline: false
            })
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
    } catch (error) {
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Error')
                    .setDescription(`Failed to get pending cleanups: ${error.message}`)
            ],
            ephemeral: true
        })
    }
}