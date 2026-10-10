const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('./safeModerationLogger')
const log = logger.scope('ServerRecovery')

class ServerRecoveryHandler {
    constructor(client) {
        this.client = client
        // Remove in-memory storage - we'll use database instead
    }

    /**
     * Handle channel deletion for Server Recovery system
     */
    async handleChannelDelete(channel, executor, config) {
        try {
            // Skip recovery if deleted by the bot itself
            if (executor.id === this.client.user.id) {
                log.debug('Channel deleted by bot - skipping recovery')
                return { success: false, reason: 'Deleted by bot' }
            }

            // Check if Server Recovery is enabled
            if (!config.serverRecovery?.enabled) {
                return { success: false, reason: 'Server Recovery not enabled' }
            }

            // Check if channel/role recovery is enabled
            if (!config.serverRecovery.channelRoleRecovery) {
                return { success: false, reason: 'Channel/Role recovery not enabled' }
            }

            // Get recovery log channel
            const recoveryChannel = await this.getRecoveryChannel(channel.guild, config)
            if (!recoveryChannel) {
                log.debug('No recovery channel configured')
                return { success: false, reason: 'No recovery channel configured' }
            }

            // Store channel data for potential recovery
            const channelData = this.extractChannelData(channel)
            const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            log.debug(`Storing recovery data with ID: ${recoveryId}`)
            
            // Store recovery data in database
            await safeModerationSchema.updateOne(
                { guildID: channel.guild.id },
                {
                    $push: {
                        pendingRecoveries: {
                            recoveryId: recoveryId,
                            type: 'channel',
                            data: channelData,
                            executorId: executor.id,
                            executorTag: executor.tag,
                            guildId: channel.guild.id,
                            timestamp: new Date(),
                            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days expiry
                        }
                    }
                }
            )
            
            log.debug('Channel recovery data stored in database')

            // Send recovery message with buttons
            await this.sendRecoveryMessage(recoveryChannel, {
                type: 'channel',
                data: channelData,
                executor: executor,
                recoveryId: recoveryId,
                deletedAt: Date.now()
            })

            log.info(`Recovery message sent for channel: ${channel.name}`)
            return { success: true }

        } catch (error) {
            log.error('Error handling channel deletion', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Handle role deletion for Server Recovery system
     */
    async handleRoleDelete(role, executor, config) {
        try {
            // Skip recovery if deleted by the bot itself
            if (executor.id === this.client.user.id) {
                log.debug('Role deleted by bot - skipping recovery')
                return { success: false, reason: 'Deleted by bot' }
            }

            // Check if Server Recovery is enabled
            if (!config.serverRecovery?.enabled) {
                return { success: false, reason: 'Server Recovery not enabled' }
            }

            // Check if channel/role recovery is enabled
            if (!config.serverRecovery.channelRoleRecovery) {
                return { success: false, reason: 'Channel/Role recovery not enabled' }
            }

            // Get recovery log channel
            const recoveryChannel = await this.getRecoveryChannel(role.guild, config)
            if (!recoveryChannel) {
                log.debug('No recovery channel configured')
                return { success: false, reason: 'No recovery channel configured' }
            }

            // Store role data for potential recovery
            const roleData = this.extractRoleData(role)
            const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            log.debug(`Storing role recovery data with ID: ${recoveryId}`)
            
            // Store recovery data in database
            await safeModerationSchema.updateOne(
                { guildID: role.guild.id },
                {
                    $push: {
                        pendingRecoveries: {
                            recoveryId: recoveryId,
                            type: 'role',
                            data: roleData,
                            executorId: executor.id,
                            executorTag: executor.tag,
                            guildId: role.guild.id,
                            timestamp: new Date(),
                            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days expiry
                        }
                    }
                }
            )
            
            log.debug('Role recovery data stored in database')

            // Send recovery message with buttons
            await this.sendRecoveryMessage(recoveryChannel, {
                type: 'role',
                data: roleData,
                executor: executor,
                recoveryId: recoveryId,
                deletedAt: Date.now()
            })

            log.info(`Recovery message sent for role: ${role.name}`)
            return { success: true }

        } catch (error) {
            log.error('Error handling role deletion', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Handle emoji deletion for Server Recovery system
     */
    async handleEmojiDelete(emoji, executor, config) {
        try {
            // Skip recovery if deleted by the bot itself
            if (executor.id === this.client.user.id) {
                log.debug('Emoji deleted by bot - skipping recovery')
                return { success: false, reason: 'Deleted by bot' }
            }

            // Check if Server Recovery is enabled
            if (!config.serverRecovery?.enabled) {
                return { success: false, reason: 'Server Recovery not enabled' }
            }

            // Check if emoji/sticker recovery is enabled
            if (!config.serverRecovery.emojiStickerRecovery) {
                return { success: false, reason: 'Emoji/Sticker recovery not enabled' }
            }

            // Get recovery log channel
            const recoveryChannel = await this.getRecoveryChannel(emoji.guild, config)
            if (!recoveryChannel) {
                log.debug('No recovery channel configured')
                return { success: false, reason: 'No recovery channel configured' }
            }

            // Store emoji data for potential recovery
            const emojiData = this.extractEmojiData(emoji)
            const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            log.debug(`Storing emoji recovery data with ID: ${recoveryId}`)
            
            // Store recovery data in database
            await safeModerationSchema.updateOne(
                { guildID: emoji.guild.id },
                {
                    $push: {
                        pendingRecoveries: {
                            recoveryId: recoveryId,
                            type: 'emoji',
                            data: emojiData,
                            executorId: executor.id,
                            executorTag: executor.tag,
                            guildId: emoji.guild.id,
                            timestamp: new Date(),
                            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days expiry
                        }
                    }
                }
            )
            
            log.debug('Emoji recovery data stored in database')

            // Send recovery message with buttons
            await this.sendRecoveryMessage(recoveryChannel, {
                type: 'emoji',
                data: emojiData,
                executor: executor,
                recoveryId: recoveryId,
                deletedAt: Date.now()
            })

            log.info(`Recovery message sent for emoji: ${emoji.name}`)
            return { success: true }

        } catch (error) {
            log.error('Error handling emoji deletion', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Handle sticker deletion for Server Recovery system
     */
    async handleStickerDelete(sticker, executor, config) {
        try {
            // Skip recovery if deleted by the bot itself
            if (executor.id === this.client.user.id) {
                log.debug('Sticker deleted by bot - skipping recovery')
                return { success: false, reason: 'Deleted by bot' }
            }

            // Check if Server Recovery is enabled
            if (!config.serverRecovery?.enabled) {
                return { success: false, reason: 'Server Recovery not enabled' }
            }

            // Check if emoji/sticker recovery is enabled
            if (!config.serverRecovery.emojiStickerRecovery) {
                return { success: false, reason: 'Emoji/Sticker recovery not enabled' }
            }

            // Get recovery log channel
            const recoveryChannel = await this.getRecoveryChannel(sticker.guild, config)
            if (!recoveryChannel) {
                log.debug('No recovery channel configured')
                return { success: false, reason: 'No recovery channel configured' }
            }

            // Store sticker data for potential recovery
            const stickerData = this.extractStickerData(sticker)
            const recoveryId = `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            
            log.debug(`Storing sticker recovery data with ID: ${recoveryId}`)
            
            // Store recovery data in database
            await safeModerationSchema.updateOne(
                { guildID: sticker.guild.id },
                {
                    $push: {
                        pendingRecoveries: {
                            recoveryId: recoveryId,
                            type: 'sticker',
                            data: stickerData,
                            executorId: executor.id,
                            executorTag: executor.tag,
                            guildId: sticker.guild.id,
                            timestamp: new Date(),
                            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days expiry
                        }
                    }
                }
            )
            
            log.debug('Sticker recovery data stored in database')

            // Send recovery message with buttons
            await this.sendRecoveryMessage(recoveryChannel, {
                type: 'sticker',
                data: stickerData,
                executor: executor,
                recoveryId: recoveryId,
                deletedAt: Date.now()
            })

            log.info(`Recovery message sent for sticker: ${sticker.name}`)
            return { success: true }

        } catch (error) {
            log.error('Error handling sticker deletion', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Get or validate recovery channel (uses centralized Server Panel channel)
     * Falls back to log channel if server panel channel is unavailable
     */
    async getRecoveryChannel(guild, config) {
        try {
            // Re-read config from DB to get freshest channel ID (may have been recreated)
            const freshConfig = await safeModerationSchema.findOne({ guildID: guild.id })
            const cfg = freshConfig || config

            // Try centralized Server Panel channel first
            if (cfg.serverPanel?.channelId) {
                const channel = await guild.channels.fetch(cfg.serverPanel.channelId).catch(() => null)
                if (channel) return channel
                log.debug('Server panel channel not found, trying log channel fallback')
            }

            // Fallback: try the log channel
            if (cfg.logChannelId) {
                const logChannel = await guild.channels.fetch(cfg.logChannelId).catch(() => null)
                if (logChannel) {
                    log.debug('Using log channel as recovery channel fallback')
                    return logChannel
                }
            }

            log.warn('No recovery channel available (server panel + log channel both missing)')
            return null
        } catch (error) {
            log.error('Error getting recovery channel', error)
            return null
        }
    }

    /**
     * Extract channel data for recovery
     */
    extractChannelData(channel) {
        return {
            name: channel.name,
            type: channel.type,
            topic: channel.topic,
            nsfw: channel.nsfw,
            rateLimitPerUser: channel.rateLimitPerUser,
            position: channel.position,
            parentId: channel.parentId,
            permissionOverwrites: channel.permissionOverwrites?.cache?.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.bitfield.toString(),
                deny: overwrite.deny.bitfield.toString()
            })) || [],
            // Voice channel specific
            bitrate: channel.bitrate,
            userLimit: channel.userLimit,
            rtcRegion: channel.rtcRegion,
            videoQualityMode: channel.videoQualityMode
        }
    }

    /**
     * Extract role data for recovery
     */
    extractRoleData(role) {
        return {
            name: role.name,
            color: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable,
            permissions: role.permissions.bitfield.toString(),
            position: role.position,
            icon: role.icon,
            unicodeEmoji: role.unicodeEmoji
        }
    }

    /**
     * Extract emoji data for recovery
     */
    extractEmojiData(emoji) {
        return {
            name: emoji.name,
            animated: emoji.animated,
            url: emoji.url,
            id: emoji.id,
            identifier: emoji.identifier
        }
    }

    /**
     * Extract sticker data for recovery
     */
    extractStickerData(sticker) {
        return {
            name: sticker.name,
            description: sticker.description,
            tags: sticker.tags,
            url: sticker.url,
            id: sticker.id,
            format: sticker.format
        }
    }

    /**
     * Send recovery message with Yes/No buttons
     */
    async sendRecoveryMessage(channel, recoveryInfo) {
        const { type, data, executor, recoveryId, deletedAt } = recoveryInfo

        const typeEmojis = {
            channel: '📁',
            role: '🎭',
            emoji: '😀',
            sticker: '🎨'
        }

        const typeNames = {
            channel: 'Channel',
            role: 'Role',
            emoji: 'Emoji',
            sticker: 'Sticker'
        }

        const embed = new EmbedBuilder()
            .setColor('#FF6B35')
            .setTitle(`🔄 ${typeNames[type]} Recovery`)
            .setDescription(`A ${type} was deleted and can be restored within 3 days.`)
            .addFields([
                {
                    name: `${typeEmojis[type]} ${typeNames[type]} Name`,
                    value: `**${data.name}**`,
                    inline: true
                },
                {
                    name: '👤 Deleted By',
                    value: `<@${executor.id}>`,
                    inline: true
                },
                {
                    name: '⏰ Deleted At',
                    value: `<t:${Math.floor(deletedAt / 1000)}:F>`,
                    inline: true
                }
            ])
            .setFooter({ text: 'Recovery expires in 3 days • Only server administrators can restore' })
            .setTimestamp()

        // Add type-specific information and thumbnails
        if (type === 'channel') {
            embed.addFields([
                {
                    name: '📋 Type',
                    value: this.getChannelTypeName(data.type),
                    inline: true
                },
                {
                    name: '🔒 Permissions',
                    value: `${data.permissionOverwrites.length} override(s)`,
                    inline: true
                }
            ])
        } else if (type === 'role') {
            embed.addFields([
                {
                    name: '🎨 Color',
                    value: data.color ? `#${data.color.toString(16).padStart(6, '0')}` : 'Default',
                    inline: true
                },
                {
                    name: '📍 Position',
                    value: `${data.position}`,
                    inline: true
                }
            ])
        } else if (type === 'emoji') {
            embed.addFields([
                {
                    name: '🎭 Type',
                    value: data.animated ? 'Animated' : 'Static',
                    inline: true
                },
                {
                    name: '🆔 ID',
                    value: `\`${data.id}\``,
                    inline: true
                }
            ])
            // Set emoji as thumbnail
            if (data.url) {
                embed.setThumbnail(data.url)
            }
        } else if (type === 'sticker') {
            embed.addFields([
                {
                    name: '📝 Description',
                    value: data.description || 'No description',
                    inline: false
                },
                {
                    name: '🏷️ Tags',
                    value: data.tags || 'No tags',
                    inline: true
                }
            ])
            // Set sticker as thumbnail
            if (data.url) {
                embed.setThumbnail(data.url)
            }
        }

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`recovery_yes_${recoveryId}`)
                    .setLabel('Restore')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`recovery_no_${recoveryId}`)
                    .setLabel('Delete Permanently')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            )

        await channel.send({
            embeds: [embed],
            components: [buttons]
        })
    }

    /**
     * Check if user has permission to interact with Server Recovery
     */
    async hasPermission(interaction, config) {
        const member = interaction.member
        const guild = interaction.guild

        // Server owner always has permission
        if (member.id === guild.ownerId) {
            return true
        }

        // Administrator permission
        if (member.permissions.has('Administrator')) {
            return true
        }

        // Manager roles (if configured)
        if (config.managerRoles && config.managerRoles.length > 0) {
            const hasManagerRole = config.managerRoles.some(roleId => 
                member.roles.cache.has(roleId)
            )
            if (hasManagerRole) {
                return true
            }
        }

        return false
    }

    /**
     * Handle recovery button interactions
     */
    async handleRecoveryInteraction(interaction) {
        try {
            log.debug(`Handling interaction: ${interaction.customId}`)
            
            // Parse the custom ID: recovery_yes_recovery_1773720407460_n81qkweil
            // Format: recovery_{response}_{recoveryId}
            const parts = interaction.customId.split('_')
            if (parts.length < 3) {
                log.debug(`Invalid custom ID format: ${interaction.customId}`)
                return false
            }
            
            const action = parts[0] // 'recovery'
            const response = parts[1] // 'yes' or 'no'
            const recoveryId = parts.slice(2).join('_') // 'recovery_1773720407460_n81qkweil'
            
            log.debug(`Parsed: action=${action} response=${response} recoveryId=${recoveryId}`)
            
            if (action !== 'recovery') return false

            // Get recovery data from database
            const config = await safeModerationSchema.findOne({ guildID: interaction.guild.id })
            if (!config) {
                await interaction.reply({
                    content: '❌ Server Recovery configuration not found.',
                    flags: [MessageFlags.Ephemeral]
                })
                return true
            }

            // Check permissions
            const hasPermission = await this.hasPermission(interaction, config)
            if (!hasPermission) {
                await interaction.reply({
                    content: '❌ You do not have permission to interact with Server Recovery. Only server owners, administrators, and manager roles can use this feature.',
                    flags: [MessageFlags.Ephemeral]
                })
                return true
            }

            const recoveryData = config.pendingRecoveries?.find(r => r.recoveryId === recoveryId)
            log.debug(`Recovery data found: ${!!recoveryData}, pending: ${config.pendingRecoveries?.length || 0}`)
            
            if (!recoveryData) {
                await interaction.reply({
                    content: '❌ This recovery request has expired or is no longer valid.',
                    flags: [MessageFlags.Ephemeral]
                })
                return true
            }

            // Check if expired
            if (new Date() > recoveryData.expiresAt) {
                // Remove expired recovery from database
                await safeModerationSchema.updateOne(
                    { guildID: interaction.guild.id },
                    { $pull: { pendingRecoveries: { recoveryId: recoveryId } } }
                )
                
                await interaction.reply({
                    content: '❌ This recovery request has expired.',
                    flags: [MessageFlags.Ephemeral]
                })
                return true
            }

            if (response === 'yes') {
                await this.performRecovery(interaction, recoveryData, recoveryId)
            } else {
                await this.cancelRecovery(interaction, recoveryData, recoveryId)
            }

            return true
        } catch (error) {
            log.error('Error handling interaction', error)
            await interaction.reply({
                content: '❌ An error occurred while processing the recovery request.',
                flags: [MessageFlags.Ephemeral]
            }).catch(() => {})
            return true
        }
    }

    /**
     * Perform the actual recovery
     */
    async performRecovery(interaction, recoveryData, recoveryId) {
        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] })

            const { type, data } = recoveryData
            const guild = interaction.guild
            let restored = null

            if (type === 'channel') {
                restored = await this.restoreChannel(guild, data)
            } else if (type === 'role') {
                restored = await this.restoreRole(guild, data)
            } else if (type === 'emoji') {
                restored = await this.restoreEmoji(guild, data)
            } else if (type === 'sticker') {
                restored = await this.restoreSticker(guild, data)
            }

            if (restored) {
                await interaction.editReply({
                    content: `✅ Successfully restored **${data.name}**`
                })

                // Update original message
                const typeNames = {
                    channel: 'Channel',
                    role: 'Role',
                    emoji: 'Emoji',
                    sticker: 'Sticker'
                }

                const embed = EmbedBuilder.from(interaction.message.embeds[0])
                    .setColor('#00FF00')
                    .setTitle(`✅ ${typeNames[type]} Restored`)
                    .addFields([
                        {
                            name: '✅ Restored By',
                            value: `<@${interaction.user.id}>`,
                            inline: true
                        },
                        {
                            name: '⏰ Restored At',
                            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                            inline: true
                        }
                    ])

                await interaction.message.edit({
                    embeds: [embed],
                    components: []
                })
            } else {
                await interaction.editReply({
                    content: `❌ Failed to restore **${data.name}**. Please check bot permissions or try again.`
                })
            }

            // Remove recovery data from database
            await safeModerationSchema.updateOne(
                { guildID: interaction.guild.id },
                { $pull: { pendingRecoveries: { recoveryId: recoveryId } } }
            )
        } catch (error) {
            log.error('Error performing recovery', error)
            await interaction.editReply({
                content: `❌ Error occurred while restoring **${recoveryData.data.name}**: ${error.message}`
            })
        }
    }

    /**
     * Cancel recovery and delete from databases
     */
    async cancelRecovery(interaction, recoveryData, recoveryId) {
        await interaction.reply({
            content: `✅ Recovery cancelled. The ${recoveryData.type} will be permanently deleted.`,
            flags: [MessageFlags.Ephemeral]
        })

        // Delete from backup databases for emoji/sticker
        if (recoveryData.type === 'emoji' || recoveryData.type === 'sticker') {
            try {
                const backupDb = require('./backupDatabaseManager')
                const B2StorageHandler = require('./b2StorageHandler')
                const b2Storage = new B2StorageHandler()

                // Delete from MongoDB backup
                const deleted = await backupDb.deleteBackup(
                    recoveryData.guildId,
                    recoveryData.data.id,
                    recoveryData.type
                )

                if (deleted) {
                    log.debug(`Deleted ${recoveryData.type} ${recoveryData.data.name} from MongoDB backup`)
                }

                // Delete from B2 storage if configured
                if (recoveryData.data.url && b2Storage.isConfigured) {
                    try {
                        // Note: We need fileId for proper B2 deletion, but we might not have it stored
                        log.debug(`Cannot delete ${recoveryData.type} from B2 - fileId not stored`)
                    } catch (b2Error) {
                        log.debug(`B2 deletion failed: ${b2Error.message}`)
                    }
                }
            } catch (error) {
                log.error(`Error deleting ${recoveryData.type} from databases`, error)
            }
        }

        // Update original message
        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#FF0000')
            .setTitle(`🗑️ Permanently Deleted`)
            .addFields([
                {
                    name: '❌ Cancelled By',
                    value: `<@${interaction.user.id}>`,
                    inline: true
                },
                {
                    name: '⏰ Cancelled At',
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                }
            ])

        await interaction.message.edit({
            embeds: [embed],
            components: []
        })

        // Remove recovery data from database
        await safeModerationSchema.updateOne(
            { guildID: interaction.guild.id },
            { $pull: { pendingRecoveries: { recoveryId: recoveryId } } }
        )
    }

    /**
     * Restore a deleted channel
     */
    async restoreChannel(guild, channelData) {
        try {
            const options = {
                name: channelData.name,
                type: channelData.type,
                topic: channelData.topic,
                nsfw: channelData.nsfw,
                rateLimitPerUser: channelData.rateLimitPerUser,
                parent: channelData.parentId,
                permissionOverwrites: channelData.permissionOverwrites.map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: BigInt(overwrite.allow),
                    deny: BigInt(overwrite.deny)
                }))
            }

            // Add voice-specific options
            if (channelData.type === ChannelType.GuildVoice || channelData.type === ChannelType.GuildStageVoice) {
                if (channelData.bitrate) options.bitrate = channelData.bitrate
                if (channelData.userLimit) options.userLimit = channelData.userLimit
                if (channelData.rtcRegion) options.rtcRegion = channelData.rtcRegion
                if (channelData.videoQualityMode) options.videoQualityMode = channelData.videoQualityMode
            }

            const restoredChannel = await guild.channels.create(options)

            // Restore original position after creation (channels.create does not support position)
            if (channelData.position != null) {
                await restoredChannel.setPosition(channelData.position, { reason: 'Safe-Moderation: Restoring original position' })
                    .catch(err => log.warn(`Could not restore channel position: ${err.message}`))
            }

            log.info(`Restored channel: ${restoredChannel.name} at position ${restoredChannel.position}`)
            return restoredChannel
        } catch (error) {
            log.error('Error restoring channel', error)
            return null
        }
    }

    /**
     * Restore a deleted role
     */
    async restoreRole(guild, roleData) {
        try {
            const desiredPosition = roleData.position
            const options = {
                name: roleData.name,
                color: roleData.color,
                hoist: roleData.hoist,
                mentionable: roleData.mentionable,
                permissions: BigInt(roleData.permissions)
            }

            if (roleData.icon) options.icon = roleData.icon
            if (roleData.unicodeEmoji) options.unicodeEmoji = roleData.unicodeEmoji

            const restoredRole = await guild.roles.create(options)

            // Restore original position after creation (roles.create position is unreliable)
            if (desiredPosition != null && desiredPosition > 0) {
                await restoredRole.setPosition(desiredPosition, { reason: 'Safe-Moderation: Restoring original position' })
                    .catch(err => log.warn(`Could not restore role position: ${err.message}`))
            }

            log.info(`Restored role: ${restoredRole.name} at position ${restoredRole.position}`)
            return restoredRole
        } catch (error) {
            log.error('Error restoring role', error)
            return null
        }
    }

    /**
     * Restore a deleted emoji
     */
    async restoreEmoji(guild, emojiData) {
        try {
            const restoredEmoji = await guild.emojis.create({
                attachment: emojiData.url,
                name: emojiData.name
            })
            log.info(`Restored emoji: ${restoredEmoji.name}`)
            return restoredEmoji
        } catch (error) {
            log.error('Error restoring emoji', error)
            return null
        }
    }

    /**
     * Restore a deleted sticker
     */
    async restoreSticker(guild, stickerData) {
        try {
            const restoredSticker = await guild.stickers.create({
                file: stickerData.url,
                name: stickerData.name,
                description: stickerData.description || '',
                tags: stickerData.tags || stickerData.name
            })
            log.info(`Restored sticker: ${restoredSticker.name}`)
            return restoredSticker
        } catch (error) {
            log.error('Error restoring sticker', error)
            return null
        }
    }

    /**
     * Get human-readable channel type name
     */
    getChannelTypeName(type) {
        const typeNames = {
            [ChannelType.GuildText]: 'Text Channel',
            [ChannelType.GuildVoice]: 'Voice Channel',
            [ChannelType.GuildCategory]: 'Category',
            [ChannelType.GuildAnnouncement]: 'Announcement Channel',
            [ChannelType.AnnouncementThread]: 'Announcement Thread',
            [ChannelType.PublicThread]: 'Public Thread',
            [ChannelType.PrivateThread]: 'Private Thread',
            [ChannelType.GuildStageVoice]: 'Stage Channel',
            [ChannelType.GuildForum]: 'Forum Channel'
        }
        return typeNames[type] || `Unknown (${type})`
    }

    /**
     * Clean up expired recovery requests and delete from databases
     */
    async cleanupExpiredRecoveries() {
        try {
            const now = new Date()
            
            // Find all guilds with expired recoveries
            const configs = await safeModerationSchema.find({
                'pendingRecoveries.expiresAt': { $lt: now }
            })

            let cleanedCount = 0
            const backupDb = require('./backupDatabaseManager')
            const B2StorageHandler = require('./b2StorageHandler')
            const b2Storage = new B2StorageHandler()

            for (const config of configs) {
                // Get expired recoveries before removing them
                const expiredRecoveries = config.pendingRecoveries.filter(
                    recovery => recovery.expiresAt < now
                )

                // Delete from backup databases for emoji/sticker recoveries
                for (const recovery of expiredRecoveries) {
                    if (recovery.type === 'emoji' || recovery.type === 'sticker') {
                        try {
                            // Delete from MongoDB backup
                            const deleted = await backupDb.deleteBackup(
                                recovery.guildId,
                                recovery.data.id,
                                recovery.type
                            )

                            if (deleted) {
                                log.debug(`Deleted ${recovery.type} ${recovery.data.name} from MongoDB backup`)
                            }

                            // Delete from B2 storage if URL exists
                            if (recovery.data.url && b2Storage.isConfigured) {
                                // Extract file info from URL or data
                                const fileName = `${recovery.type}_${recovery.data.id}`
                                
                                // Try to delete from B2 (may fail if file doesn't exist, which is fine)
                                try {
                                    // We need the fileId for B2 deletion, but we might not have it stored
                                    // This is a limitation - in future versions, we should store B2 fileId
                                    log.debug(`Cannot delete ${recovery.type} from B2 - fileId not stored`)
                                } catch (b2Error) {
                                    log.debug(`B2 deletion failed for ${recovery.type}: ${b2Error.message}`)
                                }
                            }
                        } catch (dbError) {
                            log.error(`Error deleting ${recovery.type} from databases`, dbError)
                        }
                    }
                }

                // Remove expired recoveries from config
                const result = await safeModerationSchema.updateOne(
                    { guildID: config.guildID },
                    {
                        $pull: {
                            pendingRecoveries: {
                                expiresAt: { $lt: now }
                            }
                        }
                    }
                )
                
                if (result.modifiedCount > 0) {
                    cleanedCount++
                    log.debug(`Cleaned up ${expiredRecoveries.length} expired recoveries from guild ${config.guildID}`)
                }
            }

            if (cleanedCount > 0) {
                log.info(`Cleanup complete: ${cleanedCount} guild(s) processed`)
            }
        } catch (error) {
            log.error('Error cleaning up expired recoveries', error)
        }
    }

    /**
     * Initialize cleanup interval
     */
    startCleanupInterval() {
        // Clean up expired recoveries every hour (since we have 24-hour expiry)
        setInterval(async () => {
            await this.cleanupExpiredRecoveries()
        }, 60 * 60 * 1000) // 1 hour

        log.info('Cleanup interval started (every hour)')
    }
}

module.exports = ServerRecoveryHandler