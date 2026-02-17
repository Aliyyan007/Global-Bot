/**
 * Safe-Server: Ban Detection
 * Detects when a member is banned and tracks the executor
 */

const client = require("../../index")
const { Events, AuditLogEvent } = require("discord.js")
const { handleError } = require("../../handler/errorHandler")

client.on(Events.GuildBanAdd, async (ban) => {
    try {
        console.log('[SafeServer] GuildBanAdd event triggered for user:', ban.user.tag)
        
        if (!client.safeServerTracker || !client.safeServerManager) {
            console.log('[SafeServer] Tracker or Manager not available')
            return
        }
        
        const { guild, user } = ban
        
        // Get Safe-Server config
        const safeServerSchema = require('../../schemas/safeServerSchema')
        const config = await safeServerSchema.findOne({ guildID: guild.id })
        
        console.log('[SafeServer] Config found:', !!config, 'Enabled:', config?.enabled)
        
        if (!config || !config.enabled) {
            console.log('[SafeServer] Not enabled for this guild')
            return
        }
        
        // Fetch audit log to identify executor
        console.log('[SafeServer] Fetching audit logs...')
        const auditLogs = await guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanAdd,
            limit: 5
        }).catch((err) => {
            console.error('[SafeServer] Failed to fetch audit logs:', err.message)
            return null
        })
        
        if (!auditLogs) return
        
        // Find the matching audit log entry (within last 5 seconds)
        const now = Date.now()
        const auditEntry = auditLogs.entries.find(entry => 
            entry.target.id === user.id && 
            (now - entry.createdTimestamp) < 5000
        )
        
        if (!auditEntry || !auditEntry.executor) {
            console.log('[SafeServer] No matching audit entry found')
            return
        }
        
        let executor = auditEntry.executor
        console.log('[SafeServer] Initial executor:', executor.tag, 'Is bot:', executor.bot)
        console.log('[SafeServer] Audit log reason:', auditEntry.reason)
        
        // If executor is a bot, try to extract the real user from the reason
        if (executor.bot) {
            console.log('[SafeServer] Executor is a bot, checking reason for actual moderator...')
            
            const reason = auditEntry.reason || ''
            console.log('[SafeServer] Analyzing reason:', reason)
            
            let realExecutorId = null
            let foundRealExecutor = false
            
            // Pattern 1: @username format (like @delphine_26)
            const usernameMatch = reason.match(/@([a-zA-Z0-9_\.]{2,32})/i)
            if (usernameMatch) {
                const username = usernameMatch[1]
                console.log('[SafeServer] Found username mention:', username)
                
                // Try to find member by username
                try {
                    const members = await guild.members.fetch()
                    const realExecutorMember = members.find(m => 
                        m.user.username.toLowerCase() === username.toLowerCase() ||
                        m.user.tag.toLowerCase().startsWith(username.toLowerCase())
                    )
                    
                    if (realExecutorMember && !realExecutorMember.user.bot) {
                        executor = realExecutorMember.user
                        foundRealExecutor = true
                        console.log('[SafeServer] ✅ Real executor identified by username:', executor.tag, executor.id)
                    } else {
                        console.log('[SafeServer] ❌ Could not find non-bot member with username:', username)
                    }
                } catch (err) {
                    console.log('[SafeServer] Error searching for username:', err.message)
                }
            }
            
            // Pattern 2: ID: 123456789
            if (!foundRealExecutor) {
                const idMatch = reason.match(/ID:\s*(\d{17,19})/i)
                if (idMatch) {
                    realExecutorId = idMatch[1]
                    console.log('[SafeServer] Found user ID in reason:', realExecutorId)
                }
            }
            
            // Pattern 3: <@123456789> or <@!123456789>
            if (!foundRealExecutor && !realExecutorId) {
                const mentionMatch = reason.match(/<@!?(\d{17,19})>/)
                if (mentionMatch) {
                    realExecutorId = mentionMatch[1]
                    console.log('[SafeServer] Found user mention in reason:', realExecutorId)
                }
            }
            
            // Pattern 4: Just a user ID (17-19 digits)
            if (!foundRealExecutor && !realExecutorId) {
                const plainIdMatch = reason.match(/\b(\d{17,19})\b/)
                if (plainIdMatch) {
                    realExecutorId = plainIdMatch[1]
                    console.log('[SafeServer] Found plain user ID in reason:', realExecutorId)
                }
            }
            
            // If we found a user ID, try to fetch that user
            if (!foundRealExecutor && realExecutorId) {
                try {
                    const realUser = await guild.members.fetch(realExecutorId).catch(() => null)
                    if (realUser && !realUser.user.bot) {
                        executor = realUser.user
                        foundRealExecutor = true
                        console.log('[SafeServer] ✅ Real executor identified by ID:', executor.tag, executor.id)
                    } else {
                        console.log('[SafeServer] ❌ Could not fetch real executor or they are also a bot')
                    }
                } catch (err) {
                    console.log('[SafeServer] Error fetching real executor:', err.message)
                }
            }
            
            // If we still couldn't identify the real executor, ignore this action
            if (!foundRealExecutor) {
                console.log('[SafeServer] ❌ Could not extract user info from reason, ignoring bot action')
                return
            }
        }
        
        // If still a bot after extraction attempt, ignore
        if (executor.bot) {
            console.log('[SafeServer] ❌ Final executor is still a bot, ignoring')
            return
        }
        
        console.log('[SafeServer] ✅ Final executor confirmed:', executor.tag, executor.id)
        
        // Fetch executor as guild member
        const executorMember = await guild.members.fetch(executor.id).catch(() => null)
        if (!executorMember) {
            console.log('[SafeServer] ❌ Could not fetch executor member')
            return
        }
        
        console.log('[SafeServer] ✅ Executor member fetched successfully')
        
        // Check if executor is guild owner
        if (executor.id === guild.ownerId) {
            console.log('[SafeServer] Executor is guild owner, ignoring')
            return
        }
        
        // Check if executor is whitelisted
        const executorRoles = executorMember.roles.cache.map(r => r.id)
        console.log('[SafeServer] Executor roles:', executorRoles)
        
        if (client.safeServerTracker.isWhitelisted(guild.id, executor.id, executorRoles, config)) {
            console.log('[SafeServer] Executor is whitelisted, ignoring')
            return
        }
        
        console.log('[SafeServer] ✅ Executor is not whitelisted, proceeding with tracking')
        
        // Record the action
        console.log('[SafeServer] 📝 Recording ban action for:', executor.tag, executor.id)
        await client.safeServerTracker.recordAction(guild.id, executor.id, 'ban')
        
        // Check if limit exceeded
        console.log('[SafeServer] 🔍 Checking limit for ban action...')
        console.log('[SafeServer] Config limits:', JSON.stringify(config.limits, null, 2))
        const limitCheck = await client.safeServerTracker.checkLimit(guild.id, executor.id, 'ban', config)
        
        console.log('[SafeServer] 📊 Limit check result:', JSON.stringify(limitCheck, null, 2))
        
        if (limitCheck.exceeded) {
            console.log(`[SafeServer] 🚨 BAN LIMIT EXCEEDED by ${executor.tag} in ${guild.name}`)
            console.log(`[SafeServer] Count: ${limitCheck.count}/${limitCheck.limit} in ${limitCheck.duration}s`)
            
            // Apply restriction
            console.log('[SafeServer] 🔒 Applying restriction to moderator...')
            const result = await client.safeServerManager.restrictModerator(
                guild,
                executorMember,
                'ban',
                limitCheck,
                config
            )
            
            if (result.success) {
                console.log(`[SafeServer] ✅ Successfully restricted ${executor.tag} for excessive bans`)
                console.log(`[SafeServer] Restricted actions:`, result.restrictedActions)
            } else {
                console.error(`[SafeServer] ❌ Failed to restrict ${executor.tag}:`, result.message)
                
                // Send detailed alert to log channel about the issue
                if (config.logChannelId) {
                    const logChannel = guild.channels.cache.get(config.logChannelId)
                    if (logChannel) {
                        const { EmbedBuilder } = require('discord.js')
                        
                        let solutionText = 'Check bot permissions and role hierarchy.'
                        if (result.message.includes('role must be higher')) {
                            solutionText = '**Solution:** Go to Server Settings → Roles → Drag bot\'s role ABOVE the admin/mod roles.'
                        } else if (result.message.includes('Manage Roles')) {
                            solutionText = '**Solution:** Give the bot "Manage Roles" permission in Server Settings → Roles.'
                        }
                        
                        await logChannel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0xFF0000)
                                    .setTitle('⚠️ Safe-Server: Cannot Restrict Moderator')
                                    .setDescription(`<@${executor.id}> exceeded ban limits but cannot be restricted.`)
                                    .addFields(
                                        { name: 'Moderator', value: `${executor.tag} (${executor.id})` },
                                        { name: 'Action', value: 'Ban' },
                                        { name: 'Count', value: `${limitCheck.count}/${limitCheck.limit} in ${limitCheck.duration}s` },
                                        { name: 'Error', value: result.message },
                                        { name: 'Solution', value: solutionText }
                                    )
                                    .setTimestamp()
                            ]
                        }).catch(console.error)
                    }
                }
            }
        } else if (limitCheck.enabled === false) {
            console.log(`[SafeServer] ℹ️ Ban limit is disabled, skipping restriction`)
        } else {
            console.log(`[SafeServer] ℹ️ Limit not exceeded yet. Count: ${limitCheck.count}/${limitCheck.limit} in ${limitCheck.duration}s`)
        }
        
    } catch (error) {
        console.error('[SafeServer] Error in GuildBanAdd:', error)
        handleError(error, { ownerId: client.config.discord.ownerId, context: 'SafeServer GuildBanAdd Event' })
    }
})
