const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, AuditLogEvent, PermissionsBitField } = require('discord.js')
const safeModerationSchema = require('../schemas/safeModerationSchema')
const logger = require('./safeModerationLogger')
const log = logger.scope('SentinelHub')

/**
 * Sentinel Hub - Advanced Bot Security System
 * Immediately neutralizes newly added bots and provides approval workflow
 */
class SentinelHubHandler {
    constructor(client) {
        this.client = client
        this.pendingBots = new Map() // Track bots awaiting approval
        this.processedBots = new Set() // Prevent duplicate processing
        this.initializingGuilds = new Set() // Prevent race conditions in auto-initialization
        this.AUTO_KICK_TIMEOUT = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
        
        log.debug('[SentinelHub] 🛡️ Security Console initialized')
        
        // Start cleanup interval for expired entries
        this.startCleanupInterval()
    }

    /**
     * Main handler for new bot detection and immediate neutralization
     */
    async handleBotDetection(member, config) {
        try {
            // Prevent duplicate processing
            if (this.processedBots.has(member.id)) {
                log.debug(`[SentinelHub] ⚠️ Bot ${member.user.tag} already processed, skipping`)
                return { success: false, reason: 'Already processed' }
            }

            log.debug(`[SentinelHub] 🚨 NEW BOT DETECTED: ${member.user.tag} (${member.id})`)
            
            // Mark as processed immediately
            this.processedBots.add(member.id)

            // Check if Sentinel Hub is enabled
            if (!config.sentinelHub?.enabled) {
                return { success: false, reason: 'Sentinel Hub not enabled' }
            }

            // Get executor from audit logs FIRST (before using it)
            const executor = await this.getBotAdder(member)
            if (!executor) {
                log.error('[SentinelHub] ⚠️ Could not determine who added the bot')
            }

            // IMMEDIATE SECURITY ACTION - Neutralize the bot
            const neutralizationResult = await this.neutralizeBot(member)
            
            if (!neutralizationResult.success) {
                const failureReason = neutralizationResult.reason || 'Unknown error'
                log.error(`[SentinelHub] ❌ Failed to neutralize bot: ${failureReason}`)
                log.error(`[SentinelHub] ❌ Neutralization details:`, neutralizationResult.details)
                
                // For integration-managed bots, try alternative neutralization
                if (neutralizationResult.isIntegrationManaged) {
                    log.debug(`[SentinelHub] 🔄 Attempting alternative neutralization for integration-managed bot`)
                    const alternativeResult = await this.alternativeNeutralization(member, neutralizationResult)
                    
                    // Merge alternative result into main result
                    neutralizationResult.alternativeMethod = alternativeResult
                    neutralizationResult.partialSuccess = alternativeResult.success
                }
            }

            // Get control channel (with auto-creation fallback)
            const controlChannel = await this.getControlChannel(member.guild, config)
            if (!controlChannel) {
                log.error('[SentinelHub] ❌ No control channel available - attempting fallback notification')
                // Try fallback notification methods
                await this.sendFallbackNotification(member, executor, neutralizationResult)
            }

            // Send interactive approval message or fallback notification
            let approvalMessage = null
            if (controlChannel) {
                approvalMessage = await this.sendApprovalMessage(controlChannel, {
                    bot: member,
                    executor: executor,
                    neutralization: neutralizationResult,
                    config: config
                })
            }

            // Send DM to executor about quarantine
            if (executor) {
                await this.sendExecutorDM(executor, {
                    type: 'quarantined',
                    bot: member,
                    guild: member.guild,
                    neutralization: neutralizationResult
                })
            }

            // Add quarantine role if Bot Shield is enabled
            await this.addQuarantineRoleToBot(member, config)

            // Set up auto-kick timeout
            const autoKickTimeout = setTimeout(async () => {
                await this.handleAutoKick(member.id, controlChannel)
            }, this.AUTO_KICK_TIMEOUT)

            // Store pending bot data
            this.pendingBots.set(member.id, {
                member: member,
                executor: executor,
                neutralization: neutralizationResult,
                approvalMessageId: approvalMessage?.id,
                autoKickTimeout: autoKickTimeout,
                timestamp: Date.now()
            })

            log.debug(`[SentinelHub] ✅ Bot ${member.user.tag} neutralized and awaiting approval`)
            
            // Determine overall action status
            let actionStatus = 'neutralized_and_pending_approval'
            if (!neutralizationResult.success && !neutralizationResult.partialSuccess) {
                actionStatus = 'neutralization_failed_pending_review'
            } else if (neutralizationResult.partialSuccess) {
                actionStatus = 'partially_neutralized_pending_approval'
            }
            
            return { 
                success: true, 
                action: actionStatus,
                neutralizationSuccess: neutralizationResult.success,
                partialSuccess: neutralizationResult.partialSuccess
            }

        } catch (error) {
            log.error('[SentinelHub] ❌ Error handling bot detection:', error)
            this.processedBots.delete(member.id) // Remove from processed set on error
            return { success: false, error: error.message }
        }
    }
    /**
     * CRITICAL: Immediately neutralize a newly added bot
     * Remove dangerous permissions and reposition role
     */
    async neutralizeBot(member) {
        const result = {
            success: false,
            botRole: null,
            originalPermissions: null,
            originalPosition: null,
            permissionsRemoved: false,
            roleRepositioned: false,
            riskLevel: 'UNKNOWN',
            details: [],
            reason: null,
            isIntegrationManaged: false
        }

        try {
            log.debug(`[SentinelHub] 🔒 Starting neutralization of ${member.user.tag}`)

            // Step 1: Identify bot's role
            const botRole = await this.identifyBotRole(member)
            if (!botRole) {
                result.reason = 'Could not identify bot role'
                result.details.push('❌ Could not identify bot role')
                return result
            }

            result.botRole = {
                id: botRole.id,
                name: botRole.name,
                managed: botRole.managed,
                editable: botRole.editable
            }

            log.debug(`[SentinelHub] 🎭 Identified bot role: ${botRole.name} (managed: ${botRole.managed})`)

            // Step 2: Assess risk level (before any modifications)
            result.riskLevel = this.assessRiskLevel(botRole)
            log.debug(`[SentinelHub] ⚠️ Risk Level: ${result.riskLevel}`)

            // Step 3: COPY original permissions and position BEFORE any modifications
            result.originalPermissions = botRole.permissions.bitfield.toString()
            result.originalPosition = botRole.position
            log.debug(`[SentinelHub] 📋 Stored original permissions: ${new PermissionsBitField(botRole.permissions.bitfield).toArray().join(', ')}`)
            log.debug(`[SentinelHub] 📋 Stored original position: ${botRole.position}`)

            // Step 4: Validate permissions and hierarchy
            const validation = await this.validateBotManagement(member, botRole)
            if (!validation.canManage) {
                result.reason = validation.reason
                result.details.push(`❌ Cannot manage bot: ${validation.reason}`)
                log.debug(`[SentinelHub] ⚠️ Validation failed, but will attempt permission removal anyway`)
            }

            // Step 5: Try to remove dangerous permissions (regardless of validation)
            // FIXED: Enhanced integration-managed bot detection
            const permissionResult = await this.removeDangerousPermissions(botRole)
            result.permissionsRemoved = permissionResult.success
            
            if (permissionResult.success) {
                result.details.push(`✅ Removed ${permissionResult.removedCount} dangerous permissions`)
                log.debug(`[SentinelHub] 🛡️ Removed ${permissionResult.removedCount} dangerous permissions`)
            } else {
                // FIXED: Enhanced integration-managed detection using multiple indicators
                const errorCode = permissionResult.errorCode
                const errorMsg = permissionResult.reason || ''
                const isIntegrationError = permissionResult.isIntegrationError ||
                                          errorCode === 50013 || // Missing Permissions (most common for integration-managed)
                                          errorMsg.includes('Missing Permissions') || 
                                          errorMsg.includes('managed') || 
                                          errorMsg.includes('integration') ||
                                          botRole.managed ||
                                          (botRole.tags && (botRole.tags.integrationId || botRole.tags.botId))
                
                if (isIntegrationError) {
                    result.isIntegrationManaged = true
                    log.debug(`[SentinelHub] ⚠️ Detected integration-managed bot - permission removal failed (Code: ${errorCode})`)
                }
                
                if (!result.reason) result.reason = permissionResult.reason
                result.details.push(`❌ Failed to remove permissions: ${permissionResult.reason}`)
                log.error(`[SentinelHub] ❌ Permission removal failed: ${permissionResult.reason}`)
                
                // Store additional error details for debugging
                if (permissionResult.errorCode) {
                    result.details.push(`   Error Code: ${permissionResult.errorCode}`)
                }
                if (permissionResult.rateLimited) {
                    result.details.push(`   Rate Limited: Yes`)
                }
            }

            // Step 6: Reposition role below system bot (independent of permission removal)
            const repositionResult = await this.repositionBotRole(member, botRole)
            result.roleRepositioned = repositionResult.success
            if (repositionResult.success) {
                result.details.push(`✅ Repositioned role to position ${repositionResult.newPosition}`)
                log.debug(`[SentinelHub] 📍 Repositioned role to position ${repositionResult.newPosition}`)
            } else {
                if (!result.reason) result.reason = repositionResult.reason
                result.details.push(`❌ Failed to reposition role: ${repositionResult.reason}`)
                log.error(`[SentinelHub] ❌ Role repositioning failed: ${repositionResult.reason}`)
            }

            // Overall success if at least permissions were removed OR role was repositioned
            result.success = result.permissionsRemoved || result.roleRepositioned
            
            if (result.success) {
                log.debug(`[SentinelHub] ✅ Bot ${member.user.tag} successfully neutralized`)
            } else {
                log.debug(`[SentinelHub] ⚠️ Bot ${member.user.tag} neutralization failed - reason: ${result.reason}`)
            }

            return result

        } catch (error) {
            log.error('[SentinelHub] ❌ Error during bot neutralization:', error)
            result.reason = `Neutralization error: ${error.message}`
            result.details.push(`❌ Neutralization error: ${error.message}`)
            return result
        }
    }

    /**
     * Alternative neutralization for integration-managed bots with rate limiting protection
     * Uses channel permission overwrites instead of role modification
     */
    async alternativeNeutralization(member, originalResult) {
        const result = {
            success: false,
            method: 'channel_overwrites',
            channelsRestricted: 0,
            details: [],
            reason: null,
            rateLimited: false
        }

        try {
            log.debug(`[SentinelHub] 🔄 Starting alternative neutralization for ${member.user.tag}`)
            
            const guild = member.guild
            const textChannels = guild.channels.cache.filter(channel => 
                channel.type === 0 && // Text channel
                channel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.ManageChannels)
            )

            if (textChannels.size === 0) {
                result.reason = 'No manageable text channels found'
                result.details.push('❌ No text channels available for permission overwrites')
                return result
            }

            // FIXED: Add rate limiting protection for alternative neutralization
            const rateLimitDelay = 100 // 100ms between channel operations
            const batchSize = 5 // Process 5 channels at a time
            const maxChannels = 50 // Limit to 50 channels to prevent excessive API calls
            
            const channelsToProcess = Array.from(textChannels.values()).slice(0, maxChannels)
            log.debug(`[SentinelHub] 🔄 Processing ${channelsToProcess.length} channels with rate limiting (${rateLimitDelay}ms delay, batch size: ${batchSize})`)

            let successCount = 0
            let failCount = 0
            let rateLimitHits = 0

            // Process channels in batches with rate limiting
            for (let i = 0; i < channelsToProcess.length; i += batchSize) {
                const batch = channelsToProcess.slice(i, i + batchSize)
                
                // Process batch concurrently
                const batchPromises = batch.map(async (channel) => {
                    try {
                        await channel.permissionOverwrites.create(member.id, {
                            SendMessages: false,
                            ManageMessages: false,
                            ManageChannels: false,
                            ManageRoles: false,
                            ManageWebhooks: false,
                            ManageThreads: false,
                            CreatePublicThreads: false,
                            CreatePrivateThreads: false,
                            EmbedLinks: false,
                            AttachFiles: false,
                            AddReactions: false,
                            UseExternalEmojis: false,
                            UseExternalStickers: false,
                            MentionEveryone: false,
                            ManageEvents: false,
                            // Allow basic viewing
                            ViewChannel: true,
                            ReadMessageHistory: true
                        }, 'Sentinel Hub: Alternative neutralization for integration-managed bot')
                        
                        return { success: true, channel: channel.name }
                    } catch (channelError) {
                        // Check for rate limiting
                        if (channelError.code === 429) {
                            log.error(`[SentinelHub] ⚠️ Rate limited on channel ${channel.name}`)
                            return { success: false, channel: channel.name, rateLimited: true, error: channelError.message }
                        }
                        
                        log.error(`[SentinelHub] ⚠️ Failed to restrict channel ${channel.name}:`, channelError.message)
                        return { success: false, channel: channel.name, rateLimited: false, error: channelError.message }
                    }
                })

                // Wait for batch to complete
                const batchResults = await Promise.all(batchPromises)
                
                // Process results
                for (const batchResult of batchResults) {
                    if (batchResult.success) {
                        successCount++
                    } else {
                        failCount++
                        if (batchResult.rateLimited) {
                            rateLimitHits++
                            result.rateLimited = true
                        }
                    }
                }

                // Rate limiting delay between batches (except for the last batch)
                if (i + batchSize < channelsToProcess.length) {
                    await new Promise(resolve => setTimeout(resolve, rateLimitDelay))
                }
                
                // If we hit rate limits, increase delay for next batch
                if (rateLimitHits > 0) {
                    const extraDelay = Math.min(rateLimitHits * 200, 2000) // Up to 2 seconds extra
                    log.debug(`[SentinelHub] ⚠️ Rate limit detected, adding ${extraDelay}ms extra delay`)
                    await new Promise(resolve => setTimeout(resolve, extraDelay))
                }
            }

            result.channelsRestricted = successCount
            result.success = successCount > 0

            if (result.success) {
                result.details.push(`✅ Applied restrictions to ${successCount} channels`)
                log.debug(`[SentinelHub] ✅ Alternative neutralization: restricted ${successCount} channels`)
                
                if (failCount > 0) {
                    result.details.push(`⚠️ Failed to restrict ${failCount} channels`)
                }
                
                if (rateLimitHits > 0) {
                    result.details.push(`⚠️ Hit rate limits ${rateLimitHits} times`)
                    log.debug(`[SentinelHub] ⚠️ Rate limiting encountered ${rateLimitHits} times during alternative neutralization`)
                }
            } else {
                result.reason = `Failed to restrict any channels (${failCount} failures${rateLimitHits > 0 ? `, ${rateLimitHits} rate limited` : ''})`
                result.details.push(`❌ Could not apply restrictions to any channels`)
            }

            return result

        } catch (error) {
            log.error('[SentinelHub] ❌ Error during alternative neutralization:', error)
            result.reason = `Alternative neutralization error: ${error.message}`
            result.details.push(`❌ Error: ${error.message}`)
            return result
        }
    }

    /**
     * FIXED: More reliable identification of the bot's role (prefer managed roles)
     */
    async identifyBotRole(member) {
        try {
            log.debug(`[SentinelHub] 🔍 Identifying bot role for ${member.user.tag}`)
            log.debug(`[SentinelHub] 🔍 Bot has ${member.roles.cache.size} roles:`)
            
            // Log all roles for debugging
            member.roles.cache.forEach(role => {
                if (role.id !== member.guild.id) { // Skip @everyone
                    log.debug(`   - ${role.name} (ID: ${role.id}, managed: ${role.managed}, position: ${role.position}, integration: ${role.tags?.integrationId || 'none'})`)
                }
            })

            // FIXED: Enhanced integration-managed bot detection
            // Method 1: Look for managed role with integration tag (most reliable)
            const integrationManagedRole = member.roles.cache.find(role => 
                role.managed && 
                role.id !== member.guild.id &&
                (role.tags?.integrationId || role.tags?.botId === member.id)
            )
            
            if (integrationManagedRole) {
                log.debug(`[SentinelHub] ✅ Found integration-managed role: ${integrationManagedRole.name} (integration: ${integrationManagedRole.tags?.integrationId})`)
                return integrationManagedRole
            }

            // Method 2: Look for any managed role (fallback for older bots)
            const managedRole = member.roles.cache.find(role => 
                role.managed && role.id !== member.guild.id
            )
            
            if (managedRole) {
                log.debug(`[SentinelHub] ✅ Found managed role: ${managedRole.name} (position: ${managedRole.position})`)
                return managedRole
            }

            // Method 3: Look for role with same name as bot (case insensitive)
            const namedRole = member.roles.cache.find(role => 
                role.id !== member.guild.id &&
                (role.name.toLowerCase() === member.user.username.toLowerCase() ||
                 role.name.toLowerCase().includes(member.user.username.toLowerCase()) ||
                 member.user.username.toLowerCase().includes(role.name.toLowerCase()))
            )

            if (namedRole) {
                log.debug(`[SentinelHub] ✅ Found named role: ${namedRole.name} (position: ${namedRole.position})`)
                return namedRole
            }

            // Method 4: Look for the highest non-@everyone role (most likely the bot's main role)
            const nonEveryoneRoles = member.roles.cache.filter(role => role.id !== member.guild.id)
            if (nonEveryoneRoles.size > 0) {
                const highestRole = nonEveryoneRoles.sort((a, b) => b.position - a.position).first()
                log.debug(`[SentinelHub] ✅ Found highest role: ${highestRole.name} (position: ${highestRole.position})`)
                return highestRole
            }

            log.debug(`[SentinelHub] ❌ No suitable role found for bot ${member.user.tag}`)
            return null

        } catch (error) {
            log.error('[SentinelHub] Error identifying bot role:', error)
            return null
        }
    }
    /**
     * Validate if we can manage the bot and its role
     */
    async validateBotManagement(member, botRole) {
        try {
            const guild = member.guild
            const botMember = guild.members.me

            log.debug(`[SentinelHub] 🔐 Validating bot management capabilities:`)
            log.debug(`   System bot permissions: ${botMember.permissions.toArray().join(', ')}`)
            log.debug(`   System bot highest role: ${botMember.roles.highest.name} (position: ${botMember.roles.highest.position})`)
            log.debug(`   Target bot role: ${botRole.name} (position: ${botRole.position}, editable: ${botRole.editable})`)

            // Check if we have ManageRoles permission
            if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                log.debug(`[SentinelHub] ❌ Missing ManageRoles permission`)
                return { canManage: false, reason: 'Missing ManageRoles permission' }
            }

            // Check if we have KickMembers permission (for auto-kick)
            if (!botMember.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                log.debug(`[SentinelHub] ❌ Missing KickMembers permission`)
                return { canManage: false, reason: 'Missing KickMembers permission' }
            }

            // Check role hierarchy (we must be higher)
            // Note: We removed the botRole.editable check because it's unreliable.
            // The editable property can be false initially but become true after repositioning,
            // or it might be false for integration-managed roles that can still be repositioned.
            // We only check hierarchy - if we're higher in the role hierarchy, we should try to edit.
            if (botRole.position >= botMember.roles.highest.position) {
                log.debug(`[SentinelHub] ❌ Bot role is too high in hierarchy (${botRole.position} >= ${botMember.roles.highest.position})`)
                return { canManage: false, reason: `Role is too high in hierarchy (${botRole.position} >= ${botMember.roles.highest.position})` }
            }

            log.debug(`[SentinelHub] ✅ All validations passed - can manage bot role`)
            return { canManage: true, reason: 'All validations passed' }

        } catch (error) {
            log.error('[SentinelHub] Error validating bot management:', error)
            return { canManage: false, reason: `Validation error: ${error.message}` }
        }
    }

    /**
     * Assess the risk level of the bot based on its permissions
     */
    assessRiskLevel(botRole) {
        const permissions = botRole.permissions

        // Critical permissions that pose high risk
        const criticalPerms = [
            PermissionsBitField.Flags.Administrator,
            PermissionsBitField.Flags.ManageGuild,
            PermissionsBitField.Flags.ManageRoles,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.KickMembers,
            PermissionsBitField.Flags.BanMembers
        ]

        // High-risk permissions
        const highRiskPerms = [
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ManageWebhooks,
            PermissionsBitField.Flags.ManageEmojisAndStickers,
            PermissionsBitField.Flags.ModerateMembers,
            PermissionsBitField.Flags.ViewAuditLog
        ]

        if (criticalPerms.some(perm => permissions.has(perm))) {
            return 'CRITICAL'
        }

        if (highRiskPerms.some(perm => permissions.has(perm))) {
            return 'HIGH'
        }

        if (permissions.bitfield > 0n) {
            return 'MEDIUM'
        }

        return 'LOW'
    }

    /**
     * Remove all dangerous permissions from bot role with enhanced error handling
     */
    async removeDangerousPermissions(botRole) {
        try {
            log.debug(`[SentinelHub] 🔍 Original permissions: ${botRole.permissions.toArray().join(', ')}`)
            
            // Define safe permissions that bots can keep (using bitfield values)
            const safePermissions = [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory,
                PermissionsBitField.Flags.UseExternalEmojis,
                PermissionsBitField.Flags.AddReactions,
                PermissionsBitField.Flags.EmbedLinks,
                PermissionsBitField.Flags.AttachFiles,
                PermissionsBitField.Flags.UseApplicationCommands,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.Speak
            ]

            // Get current permissions as bitfield
            const currentPermissions = botRole.permissions.bitfield
            
            // Calculate safe permissions to keep (intersection of current and safe)
            let newPermissions = 0n
            for (const safePerm of safePermissions) {
                if ((currentPermissions & safePerm) === safePerm) {
                    newPermissions |= safePerm
                }
            }

            log.debug(`[SentinelHub] 🛡️ Setting safe permissions: ${new PermissionsBitField(newPermissions).toArray().join(', ')}`)

            // FIXED: Enhanced error handling for permission removal
            try {
                await botRole.setPermissions(newPermissions, 'Sentinel Hub: Neutralized dangerous permissions')
            } catch (permissionError) {
                const errorCode = permissionError.code
                const errorMessage = permissionError.message
                
                log.error(`[SentinelHub] ❌ Permission removal failed - Code: ${errorCode}, Message: ${errorMessage}`)
                
                // Handle specific Discord API error codes
                switch (errorCode) {
                    case 50013: // Missing Permissions
                        return {
                            success: false,
                            reason: 'Missing permissions to modify bot role (integration-managed)',
                            removedCount: 0,
                            errorCode: errorCode,
                            isIntegrationError: true
                        }
                    case 50001: // Missing Access
                        return {
                            success: false,
                            reason: 'No access to modify bot role',
                            removedCount: 0,
                            errorCode: errorCode
                        }
                    case 10011: // Unknown Role
                        return {
                            success: false,
                            reason: 'Bot role no longer exists',
                            removedCount: 0,
                            errorCode: errorCode
                        }
                    case 50035: // Invalid Form Body
                        return {
                            success: false,
                            reason: 'Invalid permission values',
                            removedCount: 0,
                            errorCode: errorCode
                        }
                    case 50028: // Invalid Role
                        return {
                            success: false,
                            reason: 'Bot role is invalid or corrupted',
                            removedCount: 0,
                            errorCode: errorCode
                        }
                    case 429: // Rate Limited
                        return {
                            success: false,
                            reason: 'Rate limited by Discord API',
                            removedCount: 0,
                            errorCode: errorCode,
                            rateLimited: true
                        }
                    default:
                        // Check if error message indicates integration management
                        const isIntegrationError = errorMessage.toLowerCase().includes('managed') || 
                                                  errorMessage.toLowerCase().includes('integration') ||
                                                  botRole.managed
                        
                        return {
                            success: false,
                            reason: `Discord API error ${errorCode}: ${errorMessage}`,
                            removedCount: 0,
                            errorCode: errorCode,
                            isIntegrationError: isIntegrationError,
                            rawError: errorMessage
                        }
                }
            }

            const originalCount = botRole.permissions.toArray().length
            const newCount = new PermissionsBitField(newPermissions).toArray().length
            const removedCount = originalCount - newCount

            log.debug(`[SentinelHub] ✅ Permissions updated: ${originalCount} → ${newCount} (removed ${removedCount})`)

            return {
                success: true,
                removedCount: removedCount,
                keptPermissions: new PermissionsBitField(newPermissions).toArray(),
                originalCount: originalCount
            }

        } catch (error) {
            log.error('[SentinelHub] ❌ Unexpected error removing dangerous permissions:', error)
            
            // FIXED: Enhanced error categorization
            const isIntegrationError = error.message?.toLowerCase().includes('managed') || 
                                      error.message?.toLowerCase().includes('integration') ||
                                      botRole.managed
            
            return {
                success: false,
                reason: `Unexpected error: ${error.message}`,
                removedCount: 0,
                isIntegrationError: isIntegrationError,
                unexpectedError: true
            }
        }
    }

    /**
     * Reposition bot role just below system bot's highest role
     */
    async repositionBotRole(member, botRole) {
        try {
            const guild = member.guild
            const botMember = guild.members.me
            const systemBotHighestPosition = botMember.roles.highest.position
            const targetPosition = Math.max(1, systemBotHighestPosition - 1)

            log.debug(`[SentinelHub] 📍 Role positioning:`)
            log.debug(`   System bot highest role position: ${systemBotHighestPosition}`)
            log.debug(`   Bot role current position: ${botRole.position}`)
            log.debug(`   Target position: ${targetPosition}`)

            // Always try to move the role to the target position (below system bot)
            if (botRole.position === targetPosition) {
                log.debug(`[SentinelHub] ✅ Role already at target position`)
                return {
                    success: true,
                    reason: 'Role already at target position',
                    newPosition: botRole.position,
                    moved: false
                }
            }

            // Move the role to the target position
            await botRole.setPosition(targetPosition, 'Sentinel Hub: Secured bot role position')
            
            log.debug(`[SentinelHub] ✅ Role repositioned: ${botRole.position} → ${targetPosition}`)

            return {
                success: true,
                newPosition: targetPosition,
                oldPosition: botRole.position,
                moved: true
            }

        } catch (error) {
            log.error('[SentinelHub] Error repositioning bot role:', error)
            return {
                success: false,
                reason: error.message,
                moved: false
            }
        }
    }
    /**
     * Send interactive approval message to control channel
     */
    async sendApprovalMessage(channel, approvalInfo) {
        try {
            const { bot, executor, neutralization, config } = approvalInfo

            // Generate OAuth2 invite link
            const inviteLink = `https://discord.com/oauth2/authorize?client_id=${bot.id}&scope=bot%20applications.commands&permissions=0`

            // Determine embed color based on risk level
            const riskColors = {
                'CRITICAL': '#FF0000', // Red
                'HIGH': '#FF6600',     // Orange
                'MEDIUM': '#FFAA00',   // Yellow
                'LOW': '#00AA00'       // Green
            }
            const embedColor = riskColors[neutralization.riskLevel] || '#666666'

            // Create status indicators with detailed information
            let permissionStatus = '❌ Failed'
            let positionStatus = '❌ Not moved'
            let neutralizationStatus = '❌ Failed'
            
            if (neutralization.success) {
                neutralizationStatus = '✅ Fully Neutralized'
                permissionStatus = neutralization.permissionsRemoved ? '✅ Secured' : '❌ Failed'
                positionStatus = neutralization.roleRepositioned ? '✅ Repositioned' : '⚠️ Not moved'
            } else if (neutralization.partialSuccess && neutralization.alternativeMethod) {
                neutralizationStatus = '⚠️ Partially Neutralized (Alternative Method)'
                permissionStatus = '⚠️ Integration-managed (cannot modify)'
                positionStatus = '⚠️ Integration-managed (cannot move)'
            } else {
                neutralizationStatus = `❌ Failed: ${neutralization.reason || 'Unknown error'}`
                permissionStatus = neutralization.permissionsRemoved ? '✅ Secured' : '❌ Failed'
                positionStatus = neutralization.roleRepositioned ? '✅ Repositioned' : '❌ Not moved'
            }

            const embed = new EmbedBuilder()
                .setColor(embedColor)
                .setTitle('🚨 SENTINEL HUB - Bot Security Alert')
                .setDescription(neutralization.success ? 
                    '**A new bot has been detected and immediately neutralized. Admin approval required.**' :
                    neutralization.partialSuccess ?
                    '**A new bot has been detected. Full neutralization not possible (integration-managed), alternative restrictions applied. Admin approval required.**' :
                    `**A new bot has been detected but neutralization FAILED. Immediate admin action required!**\n⚠️ **Failure Reason:** ${neutralization.reason || 'Unknown error'}`)
                .addFields([
                    {
                        name: '🤖 Bot Information',
                        value: [
                            `**Name:** ${bot.user.username} (<@${bot.id}>)`,
                            `**ID:** \`${bot.id}\``,
                            `**Created:** <t:${Math.floor(bot.user.createdTimestamp / 1000)}:R>`,
                            `**Verified:** ${bot.user.flags?.has('VerifiedBot') ? '✅ Yes' : '❌ No'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '👤 Added By',
                        value: executor ? 
                            `**User:** ${executor.username} (<@${executor.id}>)\n**ID:** \`${executor.id}\`` :
                            '**Unknown** (Audit log unavailable)',
                        inline: true
                    },
                    {
                        name: '⚠️ Risk Assessment',
                        value: [
                            `**Level:** ${neutralization.riskLevel}`,
                            `**Role:** ${neutralization.botRole?.name || 'Unknown'}`,
                            `**Managed:** ${neutralization.botRole?.managed ? 'Yes (Integration)' : 'No'}`
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🛡️ Security Actions Taken',
                        value: [
                            `**Overall Status:** ${neutralizationStatus}`,
                            `**Permissions:** ${permissionStatus}`,
                            `**Position:** ${positionStatus}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '📋 Neutralization Details',
                        value: neutralization.details.length > 0 ? 
                            neutralization.details.join('\n') : 
                            'No detailed information available',
                        inline: false
                    },
                    ...(neutralization.alternativeMethod ? [{
                        name: '🔄 Alternative Neutralization Applied',
                        value: [
                            `**Method:** Channel Permission Overwrites`,
                            `**Channels Restricted:** ${neutralization.alternativeMethod.channelsRestricted}`,
                            `**Status:** ${neutralization.alternativeMethod.success ? '✅ Applied' : '❌ Failed'}`,
                            ...(neutralization.alternativeMethod.details.length > 0 ? 
                                neutralization.alternativeMethod.details : [])
                        ].join('\n'),
                        inline: false
                    }] : []),
                    {
                        name: '🔗 Bot Invite Link',
                        value: `[Add to Server](${inviteLink})`,
                        inline: false
                    },
                    {
                        name: '⏰ Auto-Action',
                        value: `Bot will be **automatically kicked** in **24 hours** if no action is taken.`,
                        inline: false
                    }
                ])
                .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ 
                    text: 'Sentinel Hub Security Console - Immediate action required',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp()

            // Create action buttons
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`sentinel_approve_${bot.id}`)
                        .setLabel('✅ Approve & Restore')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`sentinel_kick_${bot.id}`)
                        .setLabel('❌ Kick Bot')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`sentinel_info_${bot.id}`)
                        .setLabel('📊 Detailed Info')
                        .setStyle(ButtonStyle.Secondary)
                )

            const message = await channel.send({
                embeds: [embed],
                components: [actionRow]
            })

            log.debug(`[SentinelHub] 📨 Approval message sent for ${bot.user.tag}`)
            return message

        } catch (error) {
            log.error('[SentinelHub] Error sending approval message:', error)
            return null
        }
    }

    /**
     * Handle button interactions for bot approval/rejection with comprehensive error handling
     */
    async handleButtonInteraction(interaction) {
        try {
            if (!interaction.customId.startsWith('sentinel_')) return false

            const [, action, botId] = interaction.customId.split('_')
            
            // Validate interaction data
            if (!action || !botId) {
                await interaction.reply({
                    content: '❌ Invalid interaction data.',
                    flags: [MessageFlags.Ephemeral]
                })
                return true
            }

            const pendingBot = this.pendingBots.get(botId)
            if (!pendingBot) {
                await interaction.reply({
                    content: '❌ Bot not found or already handled.',
                    flags: [MessageFlags.Ephemeral]
                })
                return true
            }

            // Check permissions
            if (!this.hasApprovalPermission(interaction.member)) {
                await interaction.reply({
                    content: '❌ You do not have permission to manage bot approvals.',
                    flags: [MessageFlags.Ephemeral]
                })
                return true
            }

            // Defer reply to prevent timeout
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] })

            try {
                switch (action) {
                    case 'approve':
                        await this.handleBotApproval(interaction, botId, pendingBot)
                        break
                    case 'kick':
                        await this.handleBotKick(interaction, botId, pendingBot)
                        break
                    case 'info':
                        await this.handleBotInfo(interaction, botId, pendingBot)
                        break
                    default:
                        await interaction.editReply({ content: '❌ Unknown action.' })
                }
            } catch (actionError) {
                log.error(`[SentinelHub] ❌ Error handling ${action} action:`, actionError)
                await interaction.editReply({ 
                    content: `❌ Error processing ${action} request: ${actionError.message}` 
                }).catch(() => {})
            }

            return true

        } catch (error) {
            log.error('[SentinelHub] ❌ Critical error handling button interaction:', error)
            
            // Attempt to respond if we haven't already
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ A critical error occurred while processing your request.',
                        flags: [MessageFlags.Ephemeral]
                    })
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ A critical error occurred while processing your request.'
                    })
                }
            } catch (responseError) {
                log.error('[SentinelHub] ❌ Failed to send error response:', responseError)
            }
            
            return true
        }
    }
    /**
     * Handle bot approval - restore permissions and update message with comprehensive error handling
     */
    async handleBotApproval(interaction, botId, pendingBot) {
        try {
            const { member, neutralization, autoKickTimeout } = pendingBot

            // Clear auto-kick timeout
            if (autoKickTimeout) {
                clearTimeout(autoKickTimeout)
            }

            // Check if bot is still in server
            let currentMember = null
            try {
                currentMember = await interaction.guild.members.fetch(botId)
            } catch (fetchError) {
                await interaction.editReply({ 
                    content: '❌ Bot is no longer in the server or cannot be accessed.' 
                })
                this.pendingBots.delete(botId)
                this.processedBots.delete(botId)
                return
            }

            if (!currentMember) {
                await interaction.editReply({ content: '❌ Bot is no longer in the server.' })
                this.pendingBots.delete(botId)
                this.processedBots.delete(botId)
                return
            }

            // Restore original permissions if we have the data
            let restorationResult = { success: false, reason: 'No restoration data available' }
            
            if (neutralization?.botRole && neutralization?.originalPermissions) {
                restorationResult = await this.restoreBotPermissions(currentMember, neutralization)
            } else {
                log.warn(`[SentinelHub] ⚠️ Missing neutralization data for bot ${member.user.tag}`)
            }

            // Remove quarantine role if Bot Shield is enabled
            await this.removeQuarantineRoleFromBot(currentMember, interaction.guild)

            // Update the original message with error handling
            try {
                if (interaction.message && interaction.message.embeds.length > 0) {
                    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor('#00FF00')
                        .setTitle('✅ SENTINEL HUB - Bot Approved')
                        .addFields([
                            {
                                name: '✅ Approval Details',
                                value: [
                                    `**Approved By:** ${interaction.user.tag}`,
                                    `**Approved At:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                                    `**Permissions:** ${restorationResult.success ? '✅ Restored' : '⚠️ ' + restorationResult.reason}`,
                                    `**Position:** ${restorationResult.positionRestored ? '✅ Restored to ' + restorationResult.originalPosition : '⚠️ ' + (restorationResult.positionError || 'Not restored')}`
                                ].join('\n'),
                                inline: false
                            }
                        ])

                    await interaction.message.edit({
                        embeds: [updatedEmbed],
                        components: []
                    })
                } else {
                    log.warn(`[SentinelHub] ⚠️ Could not update original message - message or embeds missing`)
                }
            } catch (messageUpdateError) {
                log.error(`[SentinelHub] ❌ Error updating approval message:`, messageUpdateError)
                // Continue with approval process even if message update fails
            }

            // Send response to user
            let responseMessage = `✅ Bot **${member.user.username}** (<@${member.id}>) has been approved.`
            
            if (restorationResult.success) {
                responseMessage += `\n🔓 **Permissions:** Restored to original state`
                if (restorationResult.positionRestored) {
                    responseMessage += `\n📍 **Position:** Restored to position ${restorationResult.originalPosition}`
                } else if (restorationResult.positionError) {
                    responseMessage += `\n⚠️ **Position:** Could not restore (${restorationResult.positionError})`
                }
            } else {
                responseMessage += `\n❌ **Restoration failed:** ${restorationResult.reason}`
            }

            await interaction.editReply({ content: responseMessage })

            // Send DM to executor about approval
            if (pendingBot.executor) {
                await this.sendExecutorDM(pendingBot.executor, {
                    type: 'approved',
                    bot: member,
                    guild: interaction.guild,
                    reason: restorationResult.success ? 'Permissions and position restored' : restorationResult.reason,
                    approvedBy: interaction.user.tag
                })
            }

            // Clean up
            this.pendingBots.delete(botId)
            this.processedBots.delete(botId)

            log.debug(`[SentinelHub] ✅ Bot ${member.user.tag} approved by ${interaction.user.tag}`)

        } catch (error) {
            log.error('[SentinelHub] ❌ Critical error approving bot:', error)
            
            // Ensure cleanup on error
            this.pendingBots.delete(botId)
            this.processedBots.delete(botId)
            
            await interaction.editReply({ 
                content: `❌ Critical error approving bot: ${error.message}` 
            }).catch(() => {})
        }
    }

    /**
     * Handle bot kick - remove bot and update message with comprehensive error handling
     */
    async handleBotKick(interaction, botId, pendingBot) {
        try {
            const { member, autoKickTimeout } = pendingBot

            // Clear auto-kick timeout
            if (autoKickTimeout) {
                clearTimeout(autoKickTimeout)
            }

            // Check if bot is still in server and attempt to kick it
            let currentMember = null
            let kickResult = { success: false, reason: 'Bot not found' }

            try {
                currentMember = await interaction.guild.members.fetch(botId)
            } catch (fetchError) {
                log.debug(`[SentinelHub] ⚠️ Could not fetch bot ${member.user.tag}: ${fetchError.message}`)
                kickResult = { success: false, reason: 'Bot not found or inaccessible' }
            }

            if (currentMember) {
                try {
                    // Verify we have kick permissions
                    if (!interaction.guild.members.me?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                        throw new Error('Missing KickMembers permission')
                    }

                    await currentMember.kick(`Sentinel Hub: Rejected by ${interaction.user.tag}`)
                    kickResult = { success: true }
                    log.debug(`[SentinelHub] ✅ Successfully kicked bot ${member.user.tag}`)
                } catch (kickError) {
                    kickResult = { success: false, reason: kickError.message }
                    log.error(`[SentinelHub] ❌ Error kicking bot ${member.user.tag}:`, kickError)
                }
            }

            // Update the original message with error handling
            try {
                if (interaction.message && interaction.message.embeds.length > 0) {
                    const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
                        .setColor('#FF0000')
                        .setTitle('❌ SENTINEL HUB - Bot Rejected')
                        .addFields([
                            {
                                name: '❌ Rejection Details',
                                value: [
                                    `**Rejected By:** ${interaction.user.tag}`,
                                    `**Rejected At:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                                    `**Kick Status:** ${kickResult.success ? '✅ Successful' : '❌ ' + kickResult.reason}`
                                ].join('\n'),
                                inline: false
                            }
                        ])

                    await interaction.message.edit({
                        embeds: [updatedEmbed],
                        components: []
                    })
                } else {
                    log.warn(`[SentinelHub] ⚠️ Could not update original message - message or embeds missing`)
                }
            } catch (messageUpdateError) {
                log.error(`[SentinelHub] ❌ Error updating rejection message:`, messageUpdateError)
                // Continue with rejection process even if message update fails
            }

            // Send response to user
            const responseMessage = kickResult.success ? 
                `✅ Bot **${member.user.username}** (<@${member.id}>) has been rejected and kicked from the server.` :
                `⚠️ Bot **${member.user.username}** (<@${member.id}>) has been rejected but could not be kicked: ${kickResult.reason}`

            await interaction.editReply({ content: responseMessage })

            // Send DM to executor about rejection
            if (pendingBot.executor) {
                await this.sendExecutorDM(pendingBot.executor, {
                    type: 'kicked',
                    bot: member,
                    guild: interaction.guild,
                    reason: `Rejected by ${interaction.user.tag}`
                })
            }

            // Clean up
            this.pendingBots.delete(botId)
            this.processedBots.delete(botId)

            log.debug(`[SentinelHub] ❌ Bot ${member.user.tag} rejected by ${interaction.user.tag}`)

        } catch (error) {
            log.error('[SentinelHub] ❌ Critical error rejecting bot:', error)
            
            // Ensure cleanup on error
            this.pendingBots.delete(botId)
            this.processedBots.delete(botId)
            
            await interaction.editReply({ 
                content: `❌ Critical error rejecting bot: ${error.message}` 
            }).catch(() => {})
        }
    }

    /**
     * Handle detailed info request with comprehensive error handling
     */
    async handleBotInfo(interaction, botId, pendingBot) {
        try {
            const { member, executor, neutralization } = pendingBot

            // Validate data availability
            if (!member) {
                await interaction.editReply({ content: '❌ Bot member data not available.' })
                return
            }

            if (!neutralization) {
                await interaction.editReply({ content: '❌ Bot neutralization data not available.' })
                return
            }

            // Build info embed with error handling for missing data
            const infoEmbed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle('📊 Detailed Bot Information')
                .addFields([
                    {
                        name: '🤖 Bot Details',
                        value: [
                            `**Username:** ${member.user?.username || 'Unknown'}`,
                            `**Discriminator:** ${member.user?.discriminator || 'Unknown'}`,
                            `**ID:** \`${member.id || 'Unknown'}\``,
                            `**Created:** ${member.user?.createdTimestamp ? `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>` : 'Unknown'}`,
                            `**Account Age:** ${member.user?.createdTimestamp ? `${Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24))} days` : 'Unknown'}`,
                            `**Avatar:** ${member.user ? `[View Avatar](${member.user.displayAvatarURL({ size: 512 })})` : 'Not available'}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '👤 Added By',
                        value: executor ? [
                            `**User:** ${executor.username} (<@${executor.id}>)`,
                            `**ID:** \`${executor.id}\``,
                            `**Avatar:** [View Avatar](${executor.displayAvatarURL({ size: 256 })})`
                        ].join('\n') : 'Unknown (Audit log unavailable)',
                        inline: false
                    },
                    {
                        name: '🛡️ Security Analysis',
                        value: [
                            `**Risk Level:** ${neutralization.riskLevel || 'Unknown'}`,
                            `**Role Name:** ${neutralization.botRole?.name || 'Unknown'}`,
                            `**Role Managed:** ${neutralization.botRole?.managed !== undefined ? (neutralization.botRole.managed ? 'Yes' : 'No') : 'Unknown'}`,
                            `**Original Position:** ${neutralization.originalPosition || 'Unknown'}`,
                            `**Permissions Removed:** ${neutralization.permissionsRemoved !== undefined ? (neutralization.permissionsRemoved ? 'Yes' : 'No') : 'Unknown'}`,
                            `**Role Repositioned:** ${neutralization.roleRepositioned !== undefined ? (neutralization.roleRepositioned ? 'Yes' : 'No') : 'Unknown'}`
                        ].join('\n'),
                        inline: false
                    }
                ])
                .setTimestamp()

            // Add thumbnail if available
            if (member.user) {
                try {
                    infoEmbed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                } catch (thumbnailError) {
                    log.warn(`[SentinelHub] ⚠️ Could not set thumbnail: ${thumbnailError.message}`)
                }
            }

            // Add neutralization details if available
            if (neutralization.details && neutralization.details.length > 0) {
                infoEmbed.addFields([
                    {
                        name: '📋 Neutralization Details',
                        value: neutralization.details.slice(0, 10).join('\n') + (neutralization.details.length > 10 ? '\n... (truncated)' : ''),
                        inline: false
                    }
                ])
            }

            await interaction.editReply({ embeds: [infoEmbed] })

        } catch (error) {
            log.error('[SentinelHub] ❌ Error showing bot info:', error)
            await interaction.editReply({ 
                content: `❌ Error retrieving bot information: ${error.message}` 
            }).catch(() => {})
        }
    }
    /**
     * Restore bot permissions after approval with comprehensive validation and Discord API error handling
     */
    async restoreBotPermissions(member, neutralization) {
        try {
            // Validate inputs
            if (!member) {
                return { success: false, reason: 'Member object is null or undefined' }
            }
            if (!neutralization) {
                return { success: false, reason: 'Neutralization data is null or undefined' }
            }
            if (!neutralization.botRole?.id) {
                return { success: false, reason: 'Bot role ID not found in neutralization data' }
            }
            if (!neutralization.originalPermissions) {
                return { success: false, reason: 'Original permissions not found in neutralization data' }
            }

            // Verify bot is still in server
            const currentMember = await member.guild.members.fetch(member.id).catch(() => null)
            if (!currentMember) {
                return { success: false, reason: 'Bot is no longer in the server' }
            }

            // Get the bot role
            const botRole = member.roles.cache.get(neutralization.botRole.id)
            if (!botRole) {
                return { success: false, reason: 'Bot role no longer exists' }
            }

            // Validate we can still manage the role
            const validation = await this.validateBotManagement(currentMember, botRole)
            if (!validation.canManage) {
                return { success: false, reason: `Cannot manage bot role: ${validation.reason}` }
            }

            // Parse and validate original permissions
            let originalPermissions
            try {
                originalPermissions = BigInt(neutralization.originalPermissions)
            } catch (parseError) {
                return { success: false, reason: 'Invalid original permissions format' }
            }

            log.debug(`[SentinelHub] 🔄 Restoring exact original permissions for ${member.user.tag}`)
            log.debug(`[SentinelHub] 📋 Original permissions: ${new PermissionsBitField(originalPermissions).toArray().join(', ')}`)

            // FIXED: Add Discord API error code handling for permission restoration
            try {
                await botRole.setPermissions(
                    originalPermissions,
                    'Sentinel Hub: Restored exact original permissions after approval'
                )
                log.debug(`[SentinelHub] ✅ Restored exact permissions for ${member.user.tag}`)
            } catch (permissionError) {
                // Handle specific Discord API error codes
                const errorCode = permissionError.code
                const errorMessage = permissionError.message
                
                log.error(`[SentinelHub] ❌ Permission restoration failed - Code: ${errorCode}, Message: ${errorMessage}`)
                
                switch (errorCode) {
                    case 50013: // Missing Permissions
                        return { success: false, reason: 'Missing permissions to modify bot role' }
                    case 50001: // Missing Access
                        return { success: false, reason: 'No access to modify bot role' }
                    case 50034: // You can only bulk delete messages that are under 14 days old
                        return { success: false, reason: 'Role hierarchy issue - cannot modify this role' }
                    case 10011: // Unknown Role
                        return { success: false, reason: 'Bot role no longer exists' }
                    case 50035: // Invalid Form Body
                        return { success: false, reason: 'Invalid permission values provided' }
                    case 50028: // Invalid Role
                        return { success: false, reason: 'Bot role is invalid or corrupted' }
                    case 30001: // Maximum number of guilds reached
                    case 30002: // Maximum number of friends reached
                    case 30003: // Maximum number of pins reached for the channel
                        return { success: false, reason: 'Discord rate limit or quota exceeded' }
                    default:
                        // For unknown errors, provide detailed information
                        return { 
                            success: false, 
                            reason: `Discord API error ${errorCode}: ${errorMessage}`,
                            errorCode: errorCode,
                            rawError: errorMessage
                        }
                }
            }

            // Restore original role position if available
            let positionRestored = false
            let positionError = null
            
            if (neutralization.originalPosition !== undefined && neutralization.originalPosition !== null) {
                try {
                    log.debug(`[SentinelHub] 🔄 Restoring original role position: ${neutralization.originalPosition}`)
                    await botRole.setPosition(neutralization.originalPosition, 'Sentinel Hub: Restored original position after approval')
                    positionRestored = true
                    log.debug(`[SentinelHub] ✅ Restored role position to ${neutralization.originalPosition}`)
                } catch (positionErr) {
                    // FIXED: Add Discord API error code handling for position restoration
                    const errorCode = positionErr.code
                    const errorMessage = positionErr.message
                    
                    log.error(`[SentinelHub] ❌ Position restoration failed - Code: ${errorCode}, Message: ${errorMessage}`)
                    
                    switch (errorCode) {
                        case 50013: // Missing Permissions
                            positionError = 'Missing permissions to reposition role'
                            break
                        case 50001: // Missing Access
                            positionError = 'No access to reposition role'
                            break
                        case 10011: // Unknown Role
                            positionError = 'Role no longer exists'
                            break
                        case 50035: // Invalid Form Body
                            positionError = 'Invalid position value'
                            break
                        default:
                            positionError = `Discord API error ${errorCode}: ${errorMessage}`
                    }
                }
            } else {
                positionError = 'No original position data available'
                log.debug(`[SentinelHub] ⚠️ No original position data available`)
            }
            
            return { 
                success: true, 
                restoredPermissions: new PermissionsBitField(originalPermissions).toArray(),
                positionRestored: positionRestored,
                positionError: positionError,
                originalPosition: neutralization.originalPosition
            }

        } catch (error) {
            log.error('[SentinelHub] ❌ Error restoring bot permissions:', error)
            
            // FIXED: Enhanced error handling with Discord API error codes
            if (error.code) {
                return { 
                    success: false, 
                    reason: `Discord API error ${error.code}: ${error.message}`,
                    errorCode: error.code
                }
            }
            
            return { success: false, reason: `Restoration error: ${error.message}` }
        }
    }

    /**
     * Handle auto-kick after timeout with comprehensive error handling
     */
    async handleAutoKick(botId, controlChannel) {
        try {
            const pendingBot = this.pendingBots.get(botId)
            if (!pendingBot) {
                log.debug(`[SentinelHub] ⚠️ Auto-kick called for unknown bot ${botId}`)
                return
            }

            const { member } = pendingBot

            // Validate member object
            if (!member || !member.guild) {
                log.error(`[SentinelHub] ❌ Invalid member object for auto-kick ${botId}`)
                this.pendingBots.delete(botId)
                this.processedBots.delete(botId)
                return
            }

            // Check if bot is still in server
            let currentMember = null
            try {
                currentMember = await member.guild.members.fetch(botId)
            } catch (fetchError) {
                log.debug(`[SentinelHub] ⚠️ Bot ${member.user.tag} already left server or cannot be fetched`)
                this.pendingBots.delete(botId)
                this.processedBots.delete(botId)
                return
            }

            if (!currentMember) {
                log.debug(`[SentinelHub] ⚠️ Bot ${member.user.tag} already left server`)
                this.pendingBots.delete(botId)
                this.processedBots.delete(botId)
                return
            }

            // Attempt to kick the bot
            let kickSuccess = false
            let kickError = null
            
            try {
                // Verify we have kick permissions
                if (!member.guild.members.me?.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                    throw new Error('Missing KickMembers permission')
                }

                await currentMember.kick('Sentinel Hub: Auto-kicked after 24h timeout')
                kickSuccess = true
                log.debug(`[SentinelHub] 🕐 Auto-kicked bot ${member.user.tag} after 24h timeout`)

            } catch (error) {
                kickError = error
                log.error(`[SentinelHub] ❌ Error auto-kicking bot ${member.user.tag}:`, error)
            }

            // Send notification to control channel with error handling
            if (controlChannel) {
                try {
                    // Verify channel still exists and is accessible
                    const channelExists = await member.guild.channels.fetch(controlChannel.id).catch(() => null)
                    if (channelExists && channelExists.permissionsFor(member.guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                        
                        const autoKickEmbed = new EmbedBuilder()
                            .setColor(kickSuccess ? '#FF6600' : '#FF0000')
                            .setTitle(kickSuccess ? '🕐 Auto-Kick Executed' : '❌ Auto-Kick Failed')
                            .setDescription(kickSuccess ? 
                                `Bot **${member.user.username}** (<@${member.id}>) was automatically kicked after 24 hours with no admin action.` :
                                `Failed to auto-kick bot **${member.user.username}** (<@${member.id}>) after 24 hours.`)
                            .addFields([
                                {
                                    name: '⏰ Timeout Details',
                                    value: [
                                        `**Bot:** ${member.user.username} (<@${member.id}>)`,
                                        `**ID:** \`${member.id}\``,
                                        `**Reason:** No admin response within 24 hours`,
                                        `**Action:** ${kickSuccess ? 'Successfully kicked' : `Failed: ${kickError?.message || 'Unknown error'}`}`
                                    ].join('\n')
                                }
                            ])
                            .setTimestamp()

                        await controlChannel.send({ embeds: [autoKickEmbed] })
                        
                    } else {
                        log.warn(`[SentinelHub] ⚠️ Control channel not accessible for auto-kick notification`)
                        // Try fallback notification
                        await this.sendFallbackNotification(member, null, { 
                            success: kickSuccess, 
                            riskLevel: 'AUTO_KICK',
                            reason: kickSuccess ? 'Auto-kicked after timeout' : `Auto-kick failed: ${kickError?.message}`
                        })
                    }
                } catch (notificationError) {
                    log.error(`[SentinelHub] ❌ Error sending auto-kick notification:`, notificationError)
                }
            } else {
                // No control channel, use fallback
                await this.sendFallbackNotification(member, null, { 
                    success: kickSuccess, 
                    riskLevel: 'AUTO_KICK',
                    reason: kickSuccess ? 'Auto-kicked after timeout' : `Auto-kick failed: ${kickError?.message}`
                })
            }

            // Send DM to executor about auto-kick
            if (pendingBot.executor && kickSuccess) {
                await this.sendExecutorDM(pendingBot.executor, {
                    type: 'auto_kicked',
                    bot: member,
                    guild: member.guild,
                    reason: `Quarantined at <t:${Math.floor(pendingBot.timestamp / 1000)}:F>`
                })
            }

            // Clean up regardless of kick success
            this.pendingBots.delete(botId)
            this.processedBots.delete(botId)

        } catch (error) {
            log.error('[SentinelHub] ❌ Critical error in auto-kick handler:', error)
            // Ensure cleanup even on critical error
            this.pendingBots.delete(botId)
            this.processedBots.delete(botId)
        }
    }

    /**
     * Check if user has permission to approve/reject bots
     */
    hasApprovalPermission(member) {
        // Server owner always has permission
        if (member.id === member.guild.ownerId) {
            return true
        }

        // Administrator permission
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return true
        }

        // ManageGuild permission
        if (member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
            return true
        }

        return false
    }

    /**
     * Get bot adder from audit logs
     */
    async getBotAdder(member) {
        try {
            const auditLogs = await member.guild.fetchAuditLogs({
                type: AuditLogEvent.BotAdd,
                limit: 10
            })

            const auditEntry = auditLogs.entries.find(entry => 
                entry.target?.id === member.id && 
                Date.now() - entry.createdTimestamp < 30000 // Within last 30 seconds
            )

            return auditEntry ? auditEntry.executor : null

        } catch (error) {
            log.error('[SentinelHub] Error fetching audit log:', error)
            return null
        }
    }

    /**
     * Add quarantine role to bot if Bot Shield is enabled
     */
    async addQuarantineRoleToBot(member, config) {
        try {
            // Check if Bot Shield is enabled
            if (!config.botShield?.enabled) {
                log.debug('[SentinelHub] Bot Shield not enabled, skipping quarantine role')
                return { success: false, reason: 'Bot Shield not enabled' }
            }
            
            // Get or create quarantine role
            if (!this.client.botShieldHandler) {
                log.error('[SentinelHub] Bot Shield handler not available')
                return { success: false, reason: 'Bot Shield handler not available' }
            }
            
            const quarantineRole = await this.client.botShieldHandler.getOrCreateQuarantineRole(member.guild)
            if (!quarantineRole) {
                log.error('[SentinelHub] Failed to get quarantine role')
                return { success: false, reason: 'Failed to get quarantine role' }
            }
            
            // Add quarantine role to bot
            const result = await this.client.botShieldHandler.addQuarantineRole(member, quarantineRole)
            
            if (result.success) {
                log.debug(`[SentinelHub] ✅ Added quarantine role to ${member.user.tag}`)
            } else {
                log.error(`[SentinelHub] ❌ Failed to add quarantine role: ${result.reason}`)
            }
            
            return result
            
        } catch (error) {
            log.error('[SentinelHub] Error adding quarantine role to bot:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Remove quarantine role from bot when approved
     */
    async removeQuarantineRoleFromBot(member, guild) {
        try {
            const safeModerationSchema = require('../schemas/safeModerationSchema')
            const config = await safeModerationSchema.findOne({ guildID: guild.id })
            
            // Check if Bot Shield is enabled
            if (!config?.botShield?.enabled) {
                log.debug('[SentinelHub] Bot Shield not enabled, skipping quarantine role removal')
                return { success: false, reason: 'Bot Shield not enabled' }
            }
            
            // Get quarantine role ID from config
            if (!config.botShield.quarantineRoleId) {
                log.debug('[SentinelHub] No quarantine role ID in config')
                return { success: false, reason: 'No quarantine role ID' }
            }
            
            const quarantineRole = guild.roles.cache.get(config.botShield.quarantineRoleId)
            if (!quarantineRole) {
                log.debug('[SentinelHub] Quarantine role not found in guild')
                return { success: false, reason: 'Quarantine role not found' }
            }
            
            // Check if bot has the quarantine role
            if (!member.roles.cache.has(quarantineRole.id)) {
                log.debug(`[SentinelHub] Bot ${member.user.tag} does not have quarantine role`)
                return { success: true, reason: 'Bot does not have quarantine role' }
            }
            
            // Remove the quarantine role
            await member.roles.remove(quarantineRole, 'Sentinel Hub: Bot approved, removing quarantine')
            log.debug(`[SentinelHub] ✅ Removed quarantine role from ${member.user.tag}`)
            
            return { success: true }
            
        } catch (error) {
            log.error('[SentinelHub] Error removing quarantine role:', error)
            return { success: false, error: error.message }
        }
    }

    /**
     * Send DM notification to the executor about bot status
     */
    async sendExecutorDM(executor, dmInfo) {
        try {
            const { type, bot, guild, reason, neutralization, approvedBy } = dmInfo

            let embed
            
            if (type === 'quarantined') {
                // Bot detected and quarantined - pending approval
                embed = new EmbedBuilder()
                    .setColor('#FFA500')
                    .setTitle('🚨 Bot Quarantined - Pending Approval')
                    .setDescription(`Your bot has been **detected and quarantined** in **${guild.name}** by the Sentinel Hub security system.`)
                    .addFields([
                        {
                            name: '🤖 Bot Information',
                            value: [
                                `**Name:** ${bot.user.tag}`,
                                `**ID:** \`${bot.id}\``,
                                `**Status:** Quarantined (Neutralized)`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '🛡️ Security Actions Taken',
                            value: [
                                `**Neutralization:** ${neutralization?.success ? '✅ Fully Neutralized' : neutralization?.partialSuccess ? '⚠️ Partially Neutralized' : '❌ Failed'}`,
                                `**Permissions:** ${neutralization?.permissionsRemoved ? '✅ Dangerous permissions removed' : '⚠️ Limited'}`,
                                `**Role Position:** ${neutralization?.roleRepositioned ? '✅ Repositioned for safety' : '⚠️ Not moved'}`,
                                `**Risk Level:** ${neutralization?.riskLevel || 'Unknown'}`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '⏳ What Happens Next',
                            value: [
                                '• Server administrators will review your bot addition',
                                '• They can approve or reject the bot within 24 hours',
                                '• If approved, all permissions will be restored',
                                '• If no action is taken, the bot will be auto-kicked after 24 hours',
                                '• You will receive a DM notification about the decision'
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '📋 Why This Happens',
                            value: [
                                '• This server uses Sentinel Hub for bot security',
                                '• All new bots are quarantined and reviewed before activation',
                                '• This prevents malicious bots from damaging the server',
                                '• Your bot is safe and will be reviewed shortly'
                            ].join('\n'),
                            inline: false
                        }
                    ])
                    .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `${guild.name} - Sentinel Hub Security System`,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()
            } else if (type === 'approved') {
                // Bot approved by admin
                embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('✅ Bot Approved - Permissions Restored')
                    .setDescription(`Your bot has been **approved** in **${guild.name}** and all permissions have been restored.`)
                    .addFields([
                        {
                            name: '🤖 Bot Information',
                            value: [
                                `**Name:** ${bot.user.tag}`,
                                `**ID:** \`${bot.id}\``,
                                `**Status:** ✅ Active and fully operational`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '✅ Approval Details',
                            value: [
                                `**Approved By:** ${approvedBy || 'Server Administrator'}`,
                                `**Approved At:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                                `**Permissions:** ${reason || 'Restored to original state'}`,
                                `**Server:** ${guild.name}`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '🎉 What This Means',
                            value: [
                                '• Your bot is now fully active in the server',
                                '• All original permissions have been restored',
                                '• The bot can perform all its intended functions',
                                '• No further action is required from you',
                                '• Thank you for your patience during the review process'
                            ].join('\n'),
                            inline: false
                        }
                    ])
                    .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `${guild.name} - Sentinel Hub Security System`,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()
            } else if (type === 'kicked') {
                // Bot rejected and kicked
                embed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚫 Bot Rejected and Removed')
                    .setDescription(`Your bot has been **rejected** and removed from **${guild.name}**.`)
                    .addFields([
                        {
                            name: '🤖 Bot Information',
                            value: [
                                `**Name:** ${bot.user.tag}`,
                                `**ID:** \`${bot.id}\``,
                                `**Status:** ❌ Removed from server`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '❌ Rejection Details',
                            value: [
                                `**Reason:** ${reason || 'Rejected by administrator'}`,
                                `**Server:** ${guild.name}`,
                                `**Action Taken:** Bot was kicked from the server`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '🔄 What You Can Do',
                            value: [
                                '• Contact the server administrators to understand the reason',
                                '• Ask the server owner about bot addition policies',
                                '• Ensure your bot follows Discord Terms of Service',
                                '• Request re-evaluation if you believe this was a mistake',
                                '• Check if the bot has proper verification and documentation'
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '📋 About Sentinel Hub',
                            value: [
                                '• This server uses Sentinel Hub for bot security',
                                '• All bots are reviewed before being allowed to operate',
                                '• This protects the server from malicious or unwanted bots',
                                '• Contact server staff for more information'
                            ].join('\n'),
                            inline: false
                        }
                    ])
                    .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `${guild.name} - Sentinel Hub Security System`,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()
            } else if (type === 'auto_kicked') {
                // Bot auto-kicked after 24 hours
                embed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('⏰ Bot Auto-Removed - No Response')
                    .setDescription(`Your bot has been **automatically removed** from **${guild.name}** after 24 hours with no administrator response.`)
                    .addFields([
                        {
                            name: '🤖 Bot Information',
                            value: [
                                `**Name:** ${bot.user.tag}`,
                                `**ID:** \`${bot.id}\``,
                                `**Status:** ❌ Auto-removed (timeout)`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '⏰ Timeout Details',
                            value: [
                                `**Reason:** No administrator action within 24 hours`,
                                `**Server:** ${guild.name}`,
                                `**Action Taken:** Bot was automatically kicked`,
                                `**Quarantined At:** ${reason || 'Unknown'}`
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '🔄 What You Can Do',
                            value: [
                                '• Contact the server administrators',
                                '• Ask them to manually add your bot if they want it',
                                '• Ensure server staff are aware of the bot addition',
                                '• The bot can be re-added if administrators approve',
                                '• Consider reaching out before adding bots to new servers'
                            ].join('\n'),
                            inline: false
                        },
                        {
                            name: '📋 Why This Happened',
                            value: [
                                '• Sentinel Hub requires administrator approval for all bots',
                                '• Your bot was quarantined for 24 hours awaiting review',
                                '• No administrator took action during this period',
                                '• The bot was automatically removed as a security measure',
                                '• This is not a reflection on your bot - just no response'
                            ].join('\n'),
                            inline: false
                        }
                    ])
                    .setThumbnail(bot.user.displayAvatarURL({ dynamic: true }))
                    .setFooter({ 
                        text: `${guild.name} - Sentinel Hub Security System`,
                        iconURL: guild.iconURL({ dynamic: true })
                    })
                    .setTimestamp()
            }

            // Try to send DM to executor
            try {
                await executor.send({ embeds: [embed] })
                log.debug(`[SentinelHub] ✅ DM sent to ${executor.tag} about ${type} bot: ${bot.user.tag}`)
                return true
            } catch (dmError) {
                log.debug(`[SentinelHub] ⚠️ Could not send DM to ${executor.tag}: ${dmError.message}`)
                
                // If DM fails, try to notify in the server (if possible)
                await this.sendServerFallbackNotification(guild, executor, dmInfo)
                return false
            }

        } catch (error) {
            log.error('[SentinelHub] Error sending executor DM:', error)
            return false
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
                log.debug('[SentinelHub] No suitable channel found for fallback notification')
                return
            }

            const { type, bot, reason } = dmInfo
            let statusEmoji, statusText, message
            
            if (type === 'quarantined') {
                statusEmoji = '🚨'
                statusText = 'quarantined and pending approval'
                message = `${statusEmoji} <@${executor.id}>, your bot **${bot.user.tag}** has been **${statusText}** by Sentinel Hub.\n` +
                         `**Status:** The bot is neutralized and awaiting administrator review.\n` +
                         `**Action:** Administrators will approve or reject within 24 hours.\n` +
                         `*I tried to send you a DM with details, but your DMs are closed. Please enable DMs from server members.*`
            } else if (type === 'approved') {
                statusEmoji = '✅'
                statusText = 'approved and permissions restored'
                message = `${statusEmoji} <@${executor.id}>, your bot **${bot.user.tag}** has been **${statusText}**.\n` +
                         `**Status:** ${reason || 'Fully operational'}\n` +
                         `*I tried to send you a DM with details, but your DMs are closed. Please enable DMs from server members.*`
            } else if (type === 'kicked') {
                statusEmoji = '🚫'
                statusText = 'rejected and removed'
                message = `${statusEmoji} <@${executor.id}>, your bot **${bot.user.tag}** has been **${statusText}**.\n` +
                         `**Reason:** ${reason || 'Rejected by administrator'}\n` +
                         `*I tried to send you a DM with details, but your DMs are closed. Please enable DMs from server members.*`
            } else if (type === 'auto_kicked') {
                statusEmoji = '⏰'
                statusText = 'automatically removed after 24 hours'
                message = `${statusEmoji} <@${executor.id}>, your bot **${bot.user.tag}** has been **${statusText}**.\n` +
                         `**Reason:** No administrator action within the timeout period.\n` +
                         `*I tried to send you a DM with details, but your DMs are closed. Please enable DMs from server members.*`
            }

            await channel.send({ 
                content: message,
                allowedMentions: { users: [executor.id] }
            })
            
            log.debug(`[SentinelHub] ✅ Fallback notification sent in ${channel.name}`)

        } catch (error) {
            log.error('[SentinelHub] Error sending fallback notification:', error)
        }
    }

    /**
     * Send fallback notification when no control channel is available
     */
    async sendFallbackNotification(member, executor, neutralizationResult) {
        try {
            const guild = member.guild
            
            // Try to find system channel or general channel
            let fallbackChannel = guild.systemChannel
            
            if (!fallbackChannel) {
                // Look for general, main, or similar channels
                fallbackChannel = guild.channels.cache.find(channel => 
                    channel.type === 0 && // Text channel
                    (channel.name.includes('general') || 
                     channel.name.includes('main') || 
                     channel.name.includes('chat')) &&
                    channel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
                )
            }
            
            if (!fallbackChannel) {
                // Find any text channel we can send to
                fallbackChannel = guild.channels.cache.find(channel => 
                    channel.type === 0 && // Text channel
                    channel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
                )
            }
            
            if (fallbackChannel) {
                const fallbackEmbed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('🚨 Sentinel Hub Alert - Bot Detected')
                    .setDescription(`**A bot has been detected and neutralized. Admin attention required.**`)
                    .addFields([
                        {
                            name: '🤖 Bot Information',
                            value: `**Name:** ${member.user.tag}\n**ID:** \`${member.id}\``,
                            inline: true
                        },
                        {
                            name: '⚠️ Status',
                            value: `**Risk Level:** ${neutralizationResult.riskLevel}\n**Neutralized:** ${neutralizationResult.success ? 'Yes' : 'No'}`,
                            inline: true
                        },
                        {
                            name: '🔧 Action Required',
                            value: 'Please set up a dedicated Sentinel Hub control channel for proper bot management.',
                            inline: false
                        }
                    ])
                    .setFooter({ text: 'Sentinel Hub - Fallback notification' })
                    .setTimestamp()
                
                await fallbackChannel.send({ embeds: [fallbackEmbed] })
                log.debug(`[SentinelHub] 📨 Sent fallback notification to ${fallbackChannel.name}`)
                return true
            }
            
            // Last resort - try to DM the server owner
            try {
                const owner = await guild.fetchOwner()
                if (owner) {
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('🚨 Sentinel Hub Alert - Bot Detected')
                        .setDescription(`A bot was detected in your server **${guild.name}** but no control channel is available.`)
                        .addFields([
                            {
                                name: '🤖 Bot',
                                value: `${member.user.tag} (${member.id})`,
                                inline: false
                            },
                            {
                                name: '⚠️ Action Needed',
                                value: 'Please configure a Sentinel Hub control channel or check bot permissions.',
                                inline: false
                            }
                        ])
                        .setTimestamp()
                    
                    await owner.send({ embeds: [dmEmbed] })
                    log.debug(`[SentinelHub] 📨 Sent DM notification to server owner`)
                    return true
                }
            } catch (dmError) {
                log.debug('[SentinelHub] ⚠️ Could not send DM to server owner')
            }
            
            log.debug('[SentinelHub] ❌ No fallback notification method available')
            return false
            
        } catch (error) {
            log.error('[SentinelHub] Error sending fallback notification:', error)
            return false
        }
    }

    /**
     * Auto-initialize Sentinel Hub configuration for a guild
     */
    async autoInitializeConfig(guild) {
        // Prevent race conditions when multiple bots join simultaneously
        if (this.initializingGuilds.has(guild.id)) {
            log.debug(`[SentinelHub] ⚠️ Guild ${guild.name} already being initialized, waiting...`)
            // Wait for initialization to complete
            let attempts = 0
            while (this.initializingGuilds.has(guild.id) && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 1000))
                attempts++
            }
            
            // Try to fetch the config that should now exist
            try {
                const safeModerationSchema = require('../schemas/safeModerationSchema')
                const config = await safeModerationSchema.findOne({ guildID: guild.id })
                if (config) {
                    log.debug(`[SentinelHub] ✅ Found config after waiting for initialization`)
                    return config
                }
            } catch (error) {
                log.error('[SentinelHub] ❌ Error fetching config after wait:', error)
            }
            
            return null
        }

        try {
            this.initializingGuilds.add(guild.id)
            log.debug(`[SentinelHub] 🔧 Creating new safeModeration configuration for guild ${guild.name} (${guild.id})`)
            
            const safeModerationSchema = require('../schemas/safeModerationSchema')
            
            // Double-check if config was created while we were waiting
            const existingConfig = await safeModerationSchema.findOne({ guildID: guild.id })
            if (existingConfig) {
                log.debug(`[SentinelHub] ✅ Config already exists, enabling Sentinel Hub`)
                return await this.autoEnableSentinelHub(existingConfig, guild)
            }
            
            // Create control channel
            const controlChannel = await this.createControlChannel(guild)
            
            const newConfig = new safeModerationSchema({
                guildID: guild.id,
                enabled: true,
                initialized: true,
                sentinelHub: {
                    enabled: true,
                    controlChannelId: controlChannel?.id || null,
                    autoKickTimeout: 86400000, // 24 hours
                    riskThreshold: 'MEDIUM'
                },
                // Enable basic bot protection as well
                botProtection: {
                    enabled: true,
                    requireApproval: true
                },
                // Initialize required fields to prevent validation errors
                managerRoles: [],
                whitelistRoles: [],
                permissions: {
                    addingMassBots: {
                        enabled: true,
                        cooldown: 86400,
                        actionCount: 3,
                        timeBetweenActions: 21600,
                        restrictionType: 'global',
                        specificRoles: [],
                        specificUsers: []
                    }
                },
                activeRestrictions: [],
                dynamicRestrictionRoles: [],
                kickedBots: [],
                botRestrictions: []
            })
            
            await newConfig.save()
            log.debug(`[SentinelHub] ✅ Auto-initialized configuration for guild ${guild.name}`)
            
            return newConfig
            
        } catch (error) {
            log.error('[SentinelHub] ❌ Error auto-initializing config:', error)
            return null
        } finally {
            this.initializingGuilds.delete(guild.id)
        }
    }

    /**
     * Auto-enable Sentinel Hub for existing configuration
     */
    async autoEnableSentinelHub(config, guild) {
        try {
            log.debug(`[SentinelHub] 🔧 Auto-enabling Sentinel Hub for guild ${guild.name} (${guild.id})`)
            
            // Validate inputs
            if (!config) {
                throw new Error('Configuration object is null or undefined')
            }
            if (!guild) {
                throw new Error('Guild object is null or undefined')
            }
            
            // Ensure control channel exists and is accessible
            let controlChannelId = config.sentinelHub?.controlChannelId
            
            if (!controlChannelId) {
                log.debug('[SentinelHub] 🔧 No control channel configured, creating one...')
                const controlChannel = await this.createControlChannel(guild)
                controlChannelId = controlChannel?.id
                
                if (!controlChannelId) {
                    log.warn('[SentinelHub] ⚠️ Could not create control channel, will use fallback notifications')
                }
            } else {
                // Verify existing control channel is still accessible
                try {
                    const existingChannel = await guild.channels.fetch(controlChannelId)
                    if (!existingChannel || !existingChannel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                        log.debug('[SentinelHub] ⚠️ Existing control channel not accessible, creating new one...')
                        const newChannel = await this.createControlChannel(guild)
                        controlChannelId = newChannel?.id
                    }
                } catch (channelError) {
                    log.debug('[SentinelHub] ⚠️ Error accessing existing control channel, creating new one...')
                    const newChannel = await this.createControlChannel(guild)
                    controlChannelId = newChannel?.id
                }
            }
            
            // Update configuration with comprehensive error handling
            try {
                config.sentinelHub = {
                    enabled: true,
                    controlChannelId: controlChannelId,
                    autoKickTimeout: config.sentinelHub?.autoKickTimeout || 86400000,
                    riskThreshold: config.sentinelHub?.riskThreshold || 'MEDIUM'
                }
                
                // Also enable bot protection if not already enabled
                if (!config.botProtection?.enabled) {
                    config.botProtection = {
                        enabled: true,
                        requireApproval: true
                    }
                }
                
                // Ensure main system is enabled
                config.enabled = true
                config.initialized = true
                
                await config.save()
                log.debug(`[SentinelHub] ✅ Auto-enabled Sentinel Hub for guild ${guild.name}`)
                
            } catch (saveError) {
                log.error('[SentinelHub] ❌ Error saving configuration:', saveError)
                throw new Error(`Failed to save configuration: ${saveError.message}`)
            }
            
            return config
            
        } catch (error) {
            log.error('[SentinelHub] ❌ Error auto-enabling Sentinel Hub:', error)
            // Return original config even if update failed, but log the issue
            return config
        }
    }

    /**
     * Create a control channel for Sentinel Hub
     */
    async createControlChannel(guild) {
        try {
            // Check if bot has permission to create channels
            if (!guild.members.me?.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                log.debug(`[SentinelHub] ⚠️ Missing ManageChannels permission in guild ${guild.name}`)
                return null
            }
            
            // Look for existing sentinel hub channel
            const existingChannel = guild.channels.cache.find(channel => 
                channel.name.includes('sentinel-hub') || 
                channel.name.includes('bot-security') ||
                channel.name.includes('bot-approval')
            )
            
            if (existingChannel && existingChannel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                log.debug(`[SentinelHub] 📍 Using existing channel: ${existingChannel.name}`)
                return existingChannel
            }
            
            // Create new control channel
            const controlChannel = await guild.channels.create({
                name: 'sentinel-hub-control',
                topic: '🛡️ Sentinel Hub - Advanced Bot Security Console | Auto-generated for bot approval workflow',
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: guild.members.me,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.EmbedLinks,
                            PermissionsBitField.Flags.ManageMessages
                        ]
                    }
                ]
            })
            
            // Add permissions for server owner and administrators
            if (guild.ownerId) {
                await controlChannel.permissionOverwrites.create(guild.ownerId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                })
            }
            
            // Send welcome message
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🛡️ Sentinel Hub Control Center')
                .setDescription('**Welcome to the Sentinel Hub Advanced Bot Security Console!**\n\nThis channel has been automatically created to manage bot security for your server.')
                .addFields([
                    {
                        name: '🚨 What is Sentinel Hub?',
                        value: 'An advanced security system that automatically detects and neutralizes newly added bots, requiring admin approval before they can function.',
                        inline: false
                    },
                    {
                        name: '⚡ Auto-Enabled Features',
                        value: [
                            '✅ **Bot Detection** - Instant detection of new bots',
                            '✅ **Permission Neutralization** - Removes dangerous permissions',
                            '✅ **Approval Workflow** - Interactive approval/rejection buttons',
                            '✅ **Auto-Kick Protection** - Bots are kicked after 24h if not approved',
                            '✅ **Risk Assessment** - Analyzes bot permissions for security risks'
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '🔧 System Status',
                        value: [
                            `**Status:** 🟢 Active and Monitoring`,
                            `**Guild:** ${guild.name}`,
                            `**Auto-Kick Timeout:** 24 hours`,
                            `**Risk Threshold:** MEDIUM`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '👥 Who Can Approve Bots?',
                        value: [
                            '• Server Owner',
                            '• Users with Administrator permission',
                            '• Users with Manage Server permission'
                        ].join('\n'),
                        inline: false
                    }
                ])
                .setFooter({ 
                    text: 'Sentinel Hub is now protecting your server from unauthorized bots',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp()
            
            await controlChannel.send({ embeds: [welcomeEmbed] })
            
            log.debug(`[SentinelHub] ✅ Created control channel: ${controlChannel.name}`)
            return controlChannel
            
        } catch (error) {
            log.error('[SentinelHub] ❌ Error creating control channel:', error)
            return null
        }
    }

    /**
     * Get control channel for Sentinel Hub
     * PRIORITY: Use Server Panel channel if Bot Shield is enabled
     */
    async getControlChannel(guild, config) {
        // PRIORITY 1: If Bot Shield is enabled and Server Panel channel exists, use that
        if (config.botShield?.enabled && config.serverPanel?.enabled && config.serverPanel.channelId) {
            try {
                const serverPanelChannel = await guild.channels.fetch(config.serverPanel.channelId)
                if (serverPanelChannel && serverPanelChannel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                    log.debug(`[SentinelHub] ✅ Using Server Panel channel for bot approvals: ${serverPanelChannel.name}`)
                    return serverPanelChannel
                }
            } catch (error) {
                log.debug(`[SentinelHub] ⚠️ Server Panel channel not accessible, falling back to Sentinel Hub channel`)
            }
        }
        
        // PRIORITY 2: Try to get configured Sentinel Hub control channel
        if (config.sentinelHub?.controlChannelId) {
            try {
                const channel = await guild.channels.fetch(config.sentinelHub.controlChannelId)
                if (channel && channel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])) {
                    return channel
                }
                log.debug(`[SentinelHub] ⚠️ Configured control channel ${config.sentinelHub.controlChannelId} not accessible`)
            } catch (error) {
                log.debug(`[SentinelHub] ⚠️ Configured control channel ${config.sentinelHub.controlChannelId} not found`)
            }
        }
        
        // PRIORITY 3: No valid control channel configured - try to create one
        log.debug('[SentinelHub] 🔧 No valid control channel found, attempting to create one')
        const newChannel = await this.createControlChannel(guild)
        
        if (newChannel) {
            // Update config with new channel
            try {
                config.sentinelHub = config.sentinelHub || {}
                config.sentinelHub.controlChannelId = newChannel.id
                await config.save()
                log.debug(`[SentinelHub] ✅ Updated config with new control channel: ${newChannel.name}`)
            } catch (error) {
                log.error('[SentinelHub] ⚠️ Failed to update config with new channel:', error)
            }
            return newChannel
        }
        
        log.error('[SentinelHub] ❌ Could not create or find a valid control channel')
        return null
    }

    /**
     * Start cleanup interval for expired entries with comprehensive error handling
     */
    startCleanupInterval() {
        const cleanupInterval = setInterval(() => {
            try {
                const now = Date.now()
                const expiredThreshold = 25 * 60 * 60 * 1000 // 25 hours (1 hour after auto-kick)
                let cleanedCount = 0

                for (const [botId, data] of this.pendingBots.entries()) {
                    try {
                        if (now - data.timestamp > expiredThreshold) {
                            log.debug(`[SentinelHub] 🧹 Cleaning up expired entry for bot ${botId}`)
                            
                            // Clear timeout if it exists
                            if (data.autoKickTimeout) {
                                clearTimeout(data.autoKickTimeout)
                            }
                            
                            // Remove from maps
                            this.pendingBots.delete(botId)
                            this.processedBots.delete(botId)
                            cleanedCount++
                        }
                    } catch (entryError) {
                        log.error(`[SentinelHub] ❌ Error cleaning up entry ${botId}:`, entryError)
                        // Remove problematic entry
                        this.pendingBots.delete(botId)
                        this.processedBots.delete(botId)
                        cleanedCount++
                    }
                }

                if (cleanedCount > 0) {
                    log.debug(`[SentinelHub] 🧹 Cleanup completed: removed ${cleanedCount} expired entries`)
                }

                // Also clean up orphaned processed bots (older than 1 hour)
                const processedCleanupThreshold = 60 * 60 * 1000 // 1 hour
                let processedCleanedCount = 0
                
                // Since processedBots is a Set of IDs, we need a different approach
                // We'll periodically clear very old entries by checking if they're still in pendingBots
                if (this.processedBots.size > 1000) { // Only clean if set gets large
                    const currentPendingIds = new Set(this.pendingBots.keys())
                    const processedArray = Array.from(this.processedBots)
                    
                    // Keep only recent processed bots that are still pending
                    this.processedBots.clear()
                    for (const botId of processedArray) {
                        if (currentPendingIds.has(botId)) {
                            this.processedBots.add(botId)
                        } else {
                            processedCleanedCount++
                        }
                    }
                    
                    if (processedCleanedCount > 0) {
                        log.debug(`[SentinelHub] 🧹 Cleaned up ${processedCleanedCount} orphaned processed bot entries`)
                    }
                }

            } catch (error) {
                log.error('[SentinelHub] ❌ Error during cleanup interval:', error)
            }
        }, 60 * 60 * 1000) // Run every hour

        // Store interval reference for potential cleanup
        this.cleanupInterval = cleanupInterval
        
        log.debug('[SentinelHub] 🧹 Cleanup interval started (runs every hour)')
    }

    /**
     * Handle approve button click from interaction
     */
    async handleApproveButton(interaction, botId) {
        try {
            await interaction.deferReply({ flags: [64] })
            
            const pendingBot = this.pendingBots.get(botId)
            if (!pendingBot) {
                return interaction.editReply({ 
                    content: '❌ This bot approval request has expired or was already processed.' 
                })
            }
            
            await this.handleBotApproval(interaction, botId, pendingBot)
        } catch (error) {
            log.error('[SentinelHub] Error handling approve button:', error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while approving the bot.', 
                    flags: [64]
                }).catch(() => {})
            }
        }
    }

    /**
     * Handle kick button click from interaction
     */
    async handleKickButton(interaction, botId) {
        try {
            await interaction.deferReply({ flags: [64] })
            
            const pendingBot = this.pendingBots.get(botId)
            if (!pendingBot) {
                return interaction.editReply({ 
                    content: '❌ This bot approval request has expired or was already processed.' 
                })
            }
            
            await this.handleBotKick(interaction, botId, pendingBot)
        } catch (error) {
            log.error('[SentinelHub] Error handling kick button:', error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while kicking the bot.', 
                    flags: [64]
                }).catch(() => {})
            }
        }
    }

    /**
     * Handle info button click from interaction
     */
    async handleInfoButton(interaction, botId) {
        try {
            const pendingBot = this.pendingBots.get(botId)
            if (!pendingBot) {
                return interaction.reply({ 
                    content: '❌ This bot approval request has expired or was already processed.',
                    flags: [64]
                })
            }
            
            const { member, neutralization, executor } = pendingBot
            
            // Create detailed info embed
            const infoEmbed = new EmbedBuilder()
                .setColor('#3498DB')
                .setTitle('📊 Detailed Bot Information')
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                .addFields([
                    {
                        name: '🤖 Bot Details',
                        value: [
                            `**Name:** ${member.user.tag}`,
                            `**ID:** \`${member.id}\``,
                            `**Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
                            `**Joined:** <t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: '👤 Added By',
                        value: executor ? `${executor.tag} (${executor.id})` : 'Unknown',
                        inline: false
                    }
                ])
            
            // Add neutralization info if available
            if (neutralization) {
                // Handle originalPermissions - could be array or PermissionsBitField
                let originalPerms = []
                if (neutralization.originalPermissions) {
                    if (Array.isArray(neutralization.originalPermissions)) {
                        originalPerms = neutralization.originalPermissions
                    } else if (typeof neutralization.originalPermissions.toArray === 'function') {
                        originalPerms = neutralization.originalPermissions.toArray()
                    }
                }
                
                const currentPerms = neutralization.botRole?.permissions?.toArray() || []
                
                infoEmbed.addFields([
                    {
                        name: '� Original Permissions',
                        value: originalPerms.length > 0 ? originalPerms.join(', ') : 'None',
                        inline: false
                    },
                    {
                        name: '�️ Current Permissions',
                        value: currentPerms.length > 0 ? currentPerms.join(', ') : 'None',
                        inline: false
                    },
                    {
                        name: '📍 Role Position',
                        value: `Original: ${neutralization.originalPosition || 'Unknown'}\nCurrent: ${neutralization.botRole?.position || 'Unknown'}`,
                        inline: false
                    }
                ])
            }
            
            await interaction.reply({ embeds: [infoEmbed], flags: [64] })
        } catch (error) {
            log.error('[SentinelHub] Error handling info button:', error)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while fetching bot information.', 
                    flags: [64]
                }).catch(() => {})
            }
        }
    }


}

module.exports = SentinelHubHandler