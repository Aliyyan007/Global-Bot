const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AuditLogEvent } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('./safeModerationLogger')
const log = logger.scope('BotShield')

class BotShieldHandler {
    constructor(client) {
        this.client = client
        this.QUARANTINE_ROLE_NAME = '🔒 Bot Quarantine'
        log.info('Bot Shield handler initialized - Auto-kick mode')
    }

    /**
     * Initialize Bot Shield system when enabled
     */
    async initializeBotShield(guild, config) {
        try {
            log.info(`Initializing Bot Shield for guild: ${guild.name}`)
            
            // Create or get quarantine role
            const quarantineRole = await this.getOrCreateQuarantineRole(guild)
            
            if (!quarantineRole) {
                return { 
                    success: false, 
                    reason: 'Failed to create quarantine role' 
                }
            }
            
            // Store quarantine role ID in config
            if (!config.botShield) {
                config.botShield = {}
            }
            config.botShield.quarantineRoleId = quarantineRole.id
            await config.save()
            
            log.info(`Bot Shield initialized, quarantine role: ${quarantineRole.name} (${quarantineRole.id})`)
            
            return { 
                success: true, 
                quarantineRole: quarantineRole 
            }
            
        } catch (error) {
            log.error('Error initializing Bot Shield', error)
            return { 
                success: false, 
                error: error.message 
            }
        }
    }

    /**
     * Get or create the quarantine role
     */
    async getOrCreateQuarantineRole(guild) {
        try {
            const config = await require('../schemas/safeModerationSchema').findOne({ guildID: guild.id })
            
            // Method 1: Check config for stored role ID
            if (config?.botShield?.quarantineRoleId) {
                const existingRole = guild.roles.cache.get(config.botShield.quarantineRoleId)
                if (existingRole) {
                    log.debug(`Found quarantine role from config: ${existingRole.name}`)
                    // Enforce position just below bot's role
                    await this.enforceQuarantineRolePosition(guild, existingRole)
                    return existingRole
                } else {
                    log.warn('Config has role ID but role not found, will create new one')
                }
            }
            
            // Method 2: Search by name
            let quarantineRole = guild.roles.cache.find(r => 
                r.name === this.QUARANTINE_ROLE_NAME || 
                r.name === 'Bot-Quarantine' ||
                r.name === 'SS-Bot-Quarantine'
            )
            
            if (quarantineRole) {
                log.debug(`Found existing quarantine role: ${quarantineRole.name}`)
                
                // Update config with found role
                if (config) {
                    if (!config.botShield) config.botShield = {}
                    config.botShield.quarantineRoleId = quarantineRole.id
                    await config.save()
                }
                
                // Enforce position just below bot's role
                await this.enforceQuarantineRolePosition(guild, quarantineRole)
                return quarantineRole
            }
            
            // Method 3: Create new quarantine role
            log.debug('Creating new quarantine role')
            
            const clientMember = await guild.members.fetchMe()
            const clientHighestRole = clientMember.roles.highest
            const targetPosition = Math.max(1, clientHighestRole.position - 1)
            
            quarantineRole = await guild.roles.create({
                name: this.QUARANTINE_ROLE_NAME,
                color: 0xE67E22, // Orange color
                permissions: [], // No permissions - fully restricted
                position: targetPosition,
                reason: 'Bot Shield: Quarantine role for newly added bots',
                mentionable: false,
                hoist: false
            })
            
            // Enforce position after creation (role.create position isn't always respected)
            await this.enforceQuarantineRolePosition(guild, quarantineRole)
            
            log.info(`Created quarantine role: ${quarantineRole.name} at position ${quarantineRole.position}`)
            
            // Save to config
            if (config) {
                if (!config.botShield) config.botShield = {}
                config.botShield.quarantineRoleId = quarantineRole.id
                await config.save()
            }
            
            return quarantineRole
            
        } catch (error) {
            log.error('Error getting/creating quarantine role', error)
            return null
        }
    }

    /**
     * Add quarantine role to a bot
     */
    async addQuarantineRole(member, quarantineRole) {
        try {
            if (!quarantineRole) {
                log.error('No quarantine role provided')
                return { success: false, reason: 'No quarantine role' }
            }
            
            // Check if bot already has the role
            if (member.roles.cache.has(quarantineRole.id)) {
                log.debug(`Bot ${member.user.tag} already has quarantine role`)
                return { success: true, reason: 'Already has role' }
            }
            
            // Add the quarantine role
            await member.roles.add(quarantineRole, 'Bot Shield: Quarantine newly added bot')
            log.info(`Added quarantine role to ${member.user.tag}`)
            
            return { success: true }
            
        } catch (error) {
            log.error('Error adding quarantine role', error)
            return { success: false, reason: error.message }
        }
    }

    /**
     * Handle bot addition - Auto-kick with detailed logging
     */
    async handleBotAdd(member, config) {
        try {
            // Check if Bot Shield is enabled
            if (!config.botShield?.enabled) {
                return { success: false, reason: 'Bot Shield not enabled' }
            }

            log.info(`New bot detected: ${member.user.tag} (${member.id})`)

            // Get who added the bot from audit log
            const executor = await this.getBotAdder(member)
            if (!executor) {
                log.error('Could not determine who added the bot')
                return { success: false, reason: 'Could not determine who added the bot' }
            }

            log.debug(`Bot added by: ${executor.tag} (${executor.id})`)

            // Check if the executor has permission to add bots
            const hasPermission = await this.checkExecutorPermission(member.guild, executor, config)
            
            if (hasPermission.allowed) {
                log.info(`Bot addition allowed - ${hasPermission.reason}`)
                
                // Send DM to executor about approval
                await this.sendExecutorDM(executor, {
                    type: 'approved',
                    bot: member,
                    guild: member.guild,
                    reason: hasPermission.reason
                })
                
                // Send approval notification (bot is allowed)
                await this.sendBotApprovedNotification(member.guild, config, {
                    bot: member,
                    executor: executor,
                    reason: hasPermission.reason
                })
                
                return { success: true, action: 'approved', reason: hasPermission.reason }
            } else {
                log.info(`Bot addition not allowed - ${hasPermission.reason}`)
                
                // Extract bot information
                const botInfo = await this.extractBotInformation(member, executor)
                
                // Send DM to executor about unauthorized addition
                await this.sendExecutorDM(executor, {
                    type: 'unauthorized',
                    bot: member,
                    guild: member.guild,
                    reason: hasPermission.reason,
                    botInfo: botInfo
                })
                
                // Send detailed notification to Server Panel channel (NO KICK)
                await this.sendBotUnauthorizedNotification(member.guild, config, botInfo)
                
                log.info(`Unauthorized bot notification sent: ${member.user.tag}`)
                
                return { success: true, action: 'notified', reason: hasPermission.reason }
            }

        } catch (error) {
            log.error('Error handling bot addition', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Check if executor has permission to add bots
     */
    async checkExecutorPermission(guild, executor, config) {
        // Server owner always has permission
        if (executor.id === guild.ownerId) {
            return { allowed: true, reason: 'Server Owner' }
        }

        // Get executor as guild member
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) {
            return { allowed: false, reason: 'Executor not found in server' }
        }

        // Check manager roles FIRST (if configured)
        if (config.managerRoles && config.managerRoles.length > 0) {
            const hasManagerRole = config.managerRoles.some(roleId => 
                executorMember.roles.cache.has(roleId)
            )
            if (hasManagerRole) {
                return { allowed: true, reason: 'Manager Role' }
            }
        }

        // Check if executor is higher in hierarchy (top admin) - only if no manager roles configured
        if (!config.managerRoles || config.managerRoles.length === 0) {
            const botMember = guild.members.me
            if (executorMember.roles.highest.position > botMember.roles.highest.position) {
                return { allowed: true, reason: 'Higher Role Hierarchy' }
            }
        }

        // REMOVED: Administrator permission check - now only owner and manager roles can add bots
        // This ensures stricter control over bot additions

        // Default: not allowed (including administrators unless they have manager roles)
        return { 
            allowed: false, 
            reason: 'Insufficient permissions - Only server owner and configured manager roles can add bots' 
        }
    }

    /**
     * Extract comprehensive bot information
     */
    async extractBotInformation(member, executor) {
        const bot = member.user
        const guild = member.guild

        // Get bot creation date
        const createdAt = bot.createdAt
        const addedAt = new Date()

        // Try to get invite information
        let inviteInfo = null
        try {
            const invites = await guild.invites.fetch()
            // This is a best-effort attempt - Discord doesn't always provide this info
            inviteInfo = {
                totalInvites: invites.size,
                note: 'Specific invite link cannot be determined due to Discord API limitations'
            }
        } catch (error) {
            log.debug(`Could not fetch invite information: ${error.message}`)
        }

        // Get bot permissions
        const permissions = member.permissions.toArray()

        // Get bot roles
        const roles = member.roles.cache
            .filter(role => role.id !== guild.id) // Exclude @everyone
            .map(role => ({ id: role.id, name: role.name, position: role.position }))

        return {
            bot: {
                id: bot.id,
                tag: bot.tag,
                username: bot.username,
                discriminator: bot.discriminator,
                avatar: bot.displayAvatarURL({ dynamic: true, size: 256 }),
                createdAt: createdAt,
                accountAge: Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)), // days
                isVerified: bot.flags?.has('VerifiedBot') || false,
                permissions: permissions,
                roles: roles
            },
            executor: {
                id: executor.id,
                tag: executor.tag,
                username: executor.username,
                discriminator: executor.discriminator,
                avatar: executor.displayAvatarURL({ dynamic: true, size: 256 })
            },
            timing: {
                addedAt: addedAt,
                createdAt: createdAt,
                timeSinceCreation: addedAt.getTime() - createdAt.getTime()
            },
            invite: inviteInfo,
            guild: {
                id: guild.id,
                name: guild.name,
                memberCount: guild.memberCount
            }
        }
    }

    /**
     * Get who added the bot from audit log
     */
    async getBotAdder(member) {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.BotAdd,
                limit: 10
            })

            // Find the audit log entry for this specific bot
            const auditEntry = auditLogs.entries.find(entry => 
                entry.target?.id === member.id && 
                Date.now() - entry.createdTimestamp < 10000 // Within last 10 seconds
            )

            return auditEntry ? auditEntry.executor : null
        } catch (error) {
            log.error('Error fetching audit log', error)
            return null
        }
    }

    /**
     * Send notification for unauthorized bot addition (NO KICK)
     */
    async sendBotUnauthorizedNotification(guild, config, botInfo) {
        try {
            const logChannel = await this.getShieldChannel(guild, config)
            if (!logChannel) {
                log.debug('No log channel configured for unauthorized notification')
                return
            }

            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setTitle('⚠️ Unauthorized Bot Addition Detected')
                .setDescription('A bot was added to the server by an unauthorized user. Please review and take action if needed.')
                .addFields([
                    {
                        name: '🤖 Bot Information',
                        value: [
                            `**Name:** ${botInfo.bot.username} (<@${botInfo.bot.id}>)`,
                            `**ID:** \`${botInfo.bot.id}\``,
                            `**Created:** <t:${Math.floor(botInfo.bot.createdAt.getTime() / 1000)}:F>`,
                            `**Account Age:** ${botInfo.bot.accountAge} days`,
                            `**Verified:** ${botInfo.bot.isVerified ? '✅ Yes' : '❌ No'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '👤 Added By',
                        value: [
                            `**User:** ${botInfo.executor.username} (<@${botInfo.executor.id}>)`,
                            `**ID:** \`${botInfo.executor.id}\``
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⏰ Timing Information',
                        value: [
                            `**Added At:** <t:${Math.floor(botInfo.timing.addedAt.getTime() / 1000)}:F>`,
                            `**Time Since Creation:** ${Math.floor(botInfo.timing.timeSinceCreation / (1000 * 60 * 60 * 24))} days`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '🔐 Bot Permissions',
                        value: botInfo.bot.permissions.length > 0 
                            ? botInfo.bot.permissions.slice(0, 10).join(', ') + (botInfo.bot.permissions.length > 10 ? '...' : '')
                            : 'No special permissions',
                        inline: false
                    },
                    {
                        name: '🎭 Bot Roles',
                        value: botInfo.bot.roles.length > 0
                            ? botInfo.bot.roles.map(role => `<@&${role.id}>`).join(', ')
                            : 'No roles assigned',
                        inline: false
                    },
                    {
                        name: '📊 Server Information',
                        value: [
                            `**Server:** ${botInfo.guild.name}`,
                            `**Member Count:** ${botInfo.guild.memberCount}`,
                            `**Server ID:** \`${botInfo.guild.id}\``
                        ].join('\n'),
                        inline: false
                    }
                ])
                .setThumbnail(botInfo.bot.avatar)
                .setFooter({ 
                    text: 'Bot Shield - Notification System',
                    iconURL: botInfo.executor.avatar
                })
                .setTimestamp()

            // Add invite information if available
            if (botInfo.invite) {
                embed.addFields([
                    {
                        name: '🔗 Invite Information',
                        value: [
                            `**Total Server Invites:** ${botInfo.invite.totalInvites}`,
                            `**Note:** ${botInfo.invite.note}`
                        ].join('\n'),
                        inline: false
                    }
                ])
            }

            await logChannel.send({ embeds: [embed] })
            log.debug('Unauthorized bot notification sent')

        } catch (error) {
            log.error('Error sending unauthorized notification', error)
        }
    }

    /**
     * Send notification for kicked bot (legacy function - kept for compatibility)
     */
    async sendBotKickedNotification(guild, config, botInfo) {
        // Redirect to unauthorized notification
        return this.sendBotUnauthorizedNotification(guild, config, botInfo)
    }

    /**
     * Send notification when bot is approved
     */
    async sendBotApprovedNotification(guild, config, approvalInfo) {
        try {
            const logChannel = await this.getShieldChannel(guild, config)
            if (!logChannel) {
                log.debug('No log channel configured for approved notification')
                return
            }

            const { bot, executor, reason } = approvalInfo

            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Bot Addition Approved')
                .setDescription('A bot was added to the server by an authorized user.')
                .addFields([
                    {
                        name: '🤖 Bot Information',
                        value: [
                            `**Name:** ${bot.user.username} (<@${bot.id}>)`,
                            `**ID:** \`${bot.id}\``,
                            `**Created:** <t:${Math.floor(bot.user.createdTimestamp / 1000)}:F>`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '👤 Added By',
                        value: [
                            `**User:** ${executor.username} (<@${executor.id}>)`,
                            `**ID:** \`${executor.id}\``,
                            `**Authorization:** ${reason}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '⏰ Added At',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: false
                    }
                ])
                .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Bot Shield - Approved Addition' })
                .setTimestamp()

            await logChannel.send({ embeds: [embed] })
            log.debug('Approved bot notification sent')

        } catch (error) {
            log.error('Error sending approved notification', error)
        }
    }

    /**
     * Send DM notification to the executor about bot addition status
     */
    async sendExecutorDM(executor, dmInfo) {
        try {
            const { type, bot, guild, reason, botInfo } = dmInfo

            let embed
            
            if (type === 'approved') {
                embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Bot Addition Approved')
                    .setDescription(`Your bot addition request has been **approved** in **${guild.name}**.`)
                    .addFields([
                        {
                            name: '🤖 Bot Added',
                            value: [
                                `**Name:** ${bot.user.tag}`,
                                `**ID:** \`${bot.id}\``,
                                `**Status:** Successfully added to server`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '🏛️ Server Information',
                            value: [
                                `**Server:** ${guild.name}`,
                                `**Your Authorization:** ${reason}`,
                                `**Added At:** <t:${Math.floor(Date.now() / 1000)}:F>`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '✅ What This Means',
                            value: [
                                '• Your bot has been successfully added to the server',
                                '• The bot is now active and can perform its functions',
                                '• No further action is required from you',
                                '• Thank you for following proper bot addition procedures'
                            ].join('\n'),
                            inline: false
                        }
                    ])
                    .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `${guild.name} - Bot Shield System`,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()
            } else if (type === 'kicked') {
                embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚫 Bot Addition Rejected')
                    .setDescription(`Your bot addition request has been **rejected** and the bot was removed from **${guild.name}**.`)
                    .addFields([
                        {
                            name: '🤖 Bot Information',
                            value: [
                                `**Name:** ${bot.user.tag}`,
                                `**ID:** \`${bot.id}\``,
                                `**Status:** Removed from server`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '❌ Rejection Reason',
                            value: [
                                `**Reason:** ${reason}`,
                                `**Server:** ${guild.name}`,
                                `**Action Taken:** Bot was automatically kicked`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '📋 Who Can Add Bots',
                            value: [
                                '• **Server Owner** - Full permissions',
                                '• **Manager Roles** - Configured authorized roles only',
                                '• **Note:** Regular administrators cannot add bots unless they have manager roles'
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '🔄 What You Can Do',
                            value: [
                                '• Contact the server owner',
                                '• Request a manager role from the owner',
                                '• Ask the server owner to add the bot for you',
                                '• Check if manager roles are configured in Bot Shield settings'
                            ].join('\n'),
                            inline: false
                        }
                    ])
                    .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `${guild.name} - Bot Shield System`,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()

                // Add detailed bot information for kicked bots
                if (botInfo) {
                    embed.addFields([
                        {
                            name: '📊 Bot Details (For Reference)',
                            value: [
                                `**Account Age:** ${botInfo.bot.accountAge} days`,
                                `**Verified:** ${botInfo.bot.isVerified ? '✅ Yes' : '❌ No'}`,
                                `**Permissions:** ${botInfo.bot.permissions.length} permissions`,
                                `**Roles:** ${botInfo.bot.roles.length} roles assigned`
                            ].join('\n'),
                            inline: false
                        }
                    ])
                }
            } else if (type === 'unauthorized') {
                embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('⚠️ Unauthorized Bot Addition Detected')
                    .setDescription(`Your bot addition has been **flagged** in **${guild.name}**. The bot was NOT automatically removed.`)
                    .addFields([
                        {
                            name: '🤖 Bot Information',
                            value: [
                                `**Name:** ${bot.user.tag}`,
                                `**ID:** \`${bot.id}\``,
                                `**Status:** Added to server (awaiting approval)`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '⚠️ What Happened',
                            value: [
                                `**Reason:** ${reason}`,
                                `**Server:** ${guild.name}`,
                                `**Action Taken:** Notification sent to server administrators`,
                                `**Bot Status:** Still in server, awaiting manual review`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '📋 Who Can Add Bots',
                            value: [
                                '• **Server Owner** - Full permissions',
                                '• **Manager Roles** - Configured authorized roles only',
                                '• **Note:** Regular administrators cannot add bots unless they have manager roles'
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '🔄 What Happens Next',
                            value: [
                                '• Server administrators have been notified',
                                '• They can approve or remove the bot manually',
                                '• The bot remains in the server until action is taken',
                                '• Contact the server owner if you believe this is an error'
                            ].join('\n'),
                            inline: false
                        }
                    ])
                    .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `${guild.name} - Bot Shield System`,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()

                // Add detailed bot information for unauthorized bots
                if (botInfo) {
                    embed.addFields([
                        {
                            name: '📊 Bot Details (For Reference)',
                            value: [
                                `**Account Age:** ${botInfo.bot.accountAge} days`,
                                `**Verified:** ${botInfo.bot.isVerified ? '✅ Yes' : '❌ No'}`,
                                `**Permissions:** ${botInfo.bot.permissions.length} permissions`,
                                `**Roles:** ${botInfo.bot.roles.length} roles assigned`
                            ].join('\n'),
                            inline: false
                        }
                    ])
                }
            }

            // Try to send DM to executor
            try {
                await executor.send({ embeds: [embed] })
                log.debug(`DM sent to ${executor.tag} about ${type} bot: ${bot.user.tag}`)
            } catch (dmError) {
                log.debug(`Could not send DM to ${executor.tag}: ${dmError.message}`)
                
                // If DM fails, try to notify in the server (if possible)
                await this.sendServerFallbackNotification(guild, executor, dmInfo)
            }

        } catch (error) {
            log.error('Error sending executor DM', error)
        }
    }

    /**
     * Send fallback notification in server if DM fails
     */
    async sendServerFallbackNotification(guild, executor, dmInfo) {
        try {
            // Try to find a general channel to send the notification
            const channel = guild.systemChannel || 
                          guild.channels.cache.find(ch => ch.name.includes('general') && ch.isTextBased()) ||
                          guild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(guild.members.me).has(['SendMessages']))

            if (!channel) {
                log.debug('No suitable channel found for fallback notification')
                return
            }

            const { type, bot, reason } = dmInfo
            const statusEmoji = type === 'approved' ? '✅' : '🚫'
            const statusText = type === 'approved' ? 'approved' : 'rejected and removed'
            
            const fallbackMessage = `${statusEmoji} <@${executor.id}>, your bot addition request for **${bot.user.tag}** has been **${statusText}**.\n` +
                                  `**Reason:** ${reason}\n` +
                                  `*I tried to send you a DM with details, but your DMs are closed. Please enable DMs from server members to receive detailed notifications.*\n` +
                                  `**Note:** Only the server owner and configured manager roles can add bots.`

            await channel.send({ 
                content: fallbackMessage,
                allowedMentions: { users: [executor.id] }
            })
            
            log.debug(`Fallback notification sent in ${channel.name}`)

        } catch (error) {
            log.error('Error sending fallback notification', error)
        }
    }

    /**
     * Enforce quarantine role position to be just below the bot's highest role.
     * Should be called after role creation and periodically.
     * @returns {boolean} Whether the position was corrected
     */
    async enforceQuarantineRolePosition(guild, quarantineRole) {
        try {
            const clientMember = await guild.members.fetchMe()
            const clientHighestRole = clientMember.roles.highest
            const targetPosition = Math.max(1, clientHighestRole.position - 1)

            if (quarantineRole.position !== targetPosition) {
                await quarantineRole.setPosition(targetPosition, {
                    reason: 'Bot Shield: Enforcing quarantine role position (just below bot\'s role)'
                })
                log.info(`Quarantine role position corrected: ${quarantineRole.position} → ${targetPosition}`)
                return true
            }
            return false
        } catch (error) {
            log.error('Error enforcing quarantine role position', error)
            return false
        }
    }

    /**
     * Handle quarantine role position/permission change by another user.
     * Restores position to just below bot's role and DMs the person who changed it.
     * @param {Role} oldRole - The role before the update
     * @param {Role} newRole - The role after the update
     */
    async handleQuarantineRolePositionChange(oldRole, newRole) {
        try {
            const guild = newRole.guild
            const config = await safeModerationSchema.findOne({ guildID: guild.id })

            // Only act if Bot Shield is enabled and this is the quarantine role
            if (!config?.botShield?.enabled) return
            if (config.botShield.quarantineRoleId !== newRole.id) return

            const clientMember = await guild.members.fetchMe()
            const clientHighestRole = clientMember.roles.highest
            const targetPosition = Math.max(1, clientHighestRole.position - 1)

            // Check if the position actually changed away from the target
            const positionChanged = newRole.position !== targetPosition
            // Check if permissions were changed (quarantine role should have NO permissions)
            const permissionsChanged = newRole.permissions.bitfield !== 0n

            if (!positionChanged && !permissionsChanged) return

            // Skip if the bot itself made the change
            let executor = null
            try {
                const auditLogs = await guild.fetchAuditLogs({
                    type: AuditLogEvent.RoleUpdate,
                    limit: 5
                })
                const auditEntry = auditLogs.entries.find(entry =>
                    entry.target?.id === newRole.id &&
                    Date.now() - entry.createdTimestamp < 10000
                )
                if (auditEntry) {
                    executor = auditEntry.executor
                }
            } catch (err) {
                log.debug('Could not fetch audit log for quarantine role update')
            }

            // If the bot itself made the change, skip
            if (executor && executor.id === this.client.user.id) return

            // Restore position
            if (positionChanged) {
                log.warn(`Quarantine role position changed from ${oldRole.position} to ${newRole.position} — restoring to ${targetPosition}`)
                await newRole.setPosition(targetPosition, {
                    reason: 'Bot Shield: Restoring quarantine role position — disable Bot Shield first to modify'
                }).catch(err => log.error('Failed to restore quarantine role position', err))
            }

            // Restore permissions (should be empty)
            if (permissionsChanged) {
                log.warn(`Quarantine role permissions changed — restoring to no permissions`)
                await newRole.setPermissions(0n, 'Bot Shield: Restoring quarantine role permissions — disable Bot Shield first to modify').catch(err => log.error('Failed to restore quarantine role permissions', err))
            }

            // DM the person who changed it
            if (executor && !executor.bot) {
                try {
                    const changeDetails = []
                    if (positionChanged) changeDetails.push(`Position moved from \`${oldRole.position}\` to \`${newRole.position}\``)
                    if (permissionsChanged) changeDetails.push(`Permissions were modified`)

                    const dmEmbed = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('⚠️ Bot Shield: Quarantine Role Protected')
                        .setDescription(`You attempted to modify the **${newRole.name}** quarantine role in **${guild.name}**.\n\nThis role is **protected** by the Bot Shield system and has been **automatically restored**.`)
                        .addFields(
                            { name: '🔧 Changes Detected', value: changeDetails.join('\n') || 'Unknown change', inline: false },
                            { name: '📌 Required Position', value: `Just below the bot's role (position \`${targetPosition}\`)`, inline: true },
                            { name: '🔒 Required Permissions', value: 'None (fully restricted)', inline: true },
                            {
                                name: '💡 How to Modify',
                                value: [
                                    '**To modify or remove this role:**',
                                    '1. Disable Bot Shield via `/safe-moderation` panel',
                                    '2. Make your changes to the quarantine role',
                                    '3. Re-enable Bot Shield if needed'
                                ].join('\n'),
                                inline: false
                            }
                        )
                        .setFooter({ text: 'Bot Shield — Quarantine Role Protection' })
                        .setTimestamp()

                    await executor.send({ embeds: [dmEmbed] })
                    log.debug(`Sent quarantine role protection DM to ${executor.tag}`)
                } catch (dmErr) {
                    log.debug(`Could not send DM to ${executor.tag}: ${dmErr.message}`)
                }
            }

            // Also send notification to server panel channel
            const { sendNotification } = require('./safeModerationHelpers')
            const notifEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔒 Quarantine Role Modification Blocked')
                .setDescription(`Someone tried to modify the quarantine role and it was automatically restored.`)
                .addFields(
                    { name: '👤 Modified By', value: executor ? `<@${executor.id}> (${executor.tag})` : 'Unknown', inline: true },
                    { name: '🔄 Action Taken', value: 'Position and/or permissions restored', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Disable Bot Shield to modify this role' })

            await sendNotification(guild, config, notifEmbed).catch(() => {})

        } catch (error) {
            log.error('Error handling quarantine role position change', error)
        }
    }

    /**
     * Get Bot Shield log channel (uses centralized Server Panel channel)
     */
    async getShieldChannel(guild, config) {
        // Use centralized Server Panel channel
        if (!config.serverPanel?.channelId) {
            return null
        }

        try {
            return await guild.channels.fetch(config.serverPanel.channelId)
        } catch (error) {
            log.error('Error fetching server panel channel', error)
            return null
        }
    }
}

module.exports = BotShieldHandler