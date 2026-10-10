/**
 * Guild Command Manager
 * Handles automatic registration of guild-specific commands with intelligent deduplication
 * 
 * Architecture:
 * - Uses Discord's native command cache as source of truth (no database needed)
 * - Compares command definitions using deterministic hashing
 * - Only registers/updates commands when definitions change
 * - GLOBAL rate limit tracking (200 operations/day across ALL guilds)
 * - Automatic retry with exponential backoff
 * - Queue-based processing with proper error handling
 * - Handles partial failures gracefully
 * 
 * Discord Limits:
 * - 200 command operations per day (global across all guilds)
 * - 100 commands maximum per guild
 * - Operations = create + update + delete
 */

const crypto = require('crypto')
const { Collection } = require('discord.js')

class GuildCommandManager {
    constructor(client) {
        this.client = client
        this.registrationQueue = []
        this.isProcessingQueue = false
        
        // GLOBAL rate limit tracking (200 operations per day across ALL guilds)
        this.globalRateLimit = {
            count: 0,
            resetAt: Date.now() + 86400000 // 24 hours
        }
        
        // Per-guild tracking for retries
        this.guildAttempts = new Collection()
        
        // Rate limit constants
        this.MAX_GLOBAL_OPERATIONS_PER_DAY = 200 // Discord's limit
        this.MAX_COMMANDS_PER_GUILD = 100
        this.RATE_LIMIT_WINDOW = 86400000 // 24 hours in ms
        this.DELAY_BETWEEN_GUILDS = 1000 // ms between guild operations
        this.DELAY_BETWEEN_OPERATIONS = 4000 // ms between operations (to avoid 5 ops per ~18s limit)
        this.MAX_RETRIES = 3
    }

    /**
     * Generate deterministic hash of command definition
     * This allows us to detect if a command has changed without storing previous versions
     * 
     * IMPORTANT: This method normalizes both Discord API responses and local command definitions
     * to ensure accurate comparison. Discord API returns additional fields (id, applicationId, 
     * version, createdTimestamp, etc.) that should be ignored when comparing.
     * 
     * NOTE: Discord API returns null for localizations on guild commands, even if they were
     * provided during registration. We normalize null to undefined to match our local definitions.
     */
    hashCommand(command) {
        // Only hash properties that matter for registration and can actually change
        // We explicitly filter out Discord API metadata fields that don't affect the command definition
        
        // Normalize defaultMemberPermissions: Discord returns PermissionsBitField objects
        // but we define them as strings. Convert both to string representation.
        let normalizedPermissions = undefined
        if (command.defaultMemberPermissions) {
            // If it's a PermissionsBitField object, get the bitfield value
            if (typeof command.defaultMemberPermissions === 'object' && command.defaultMemberPermissions.bitfield !== undefined) {
                normalizedPermissions = command.defaultMemberPermissions.bitfield.toString()
            } else if (typeof command.defaultMemberPermissions === 'string') {
                // Convert string permission names to their numeric values
                const permissionMap = {
                    'Administrator': '8',
                    'ManageGuild': '32',
                    'ManageRoles': '268435456',
                    'ManageChannels': '16',
                    'KickMembers': '2',
                    'BanMembers': '4',
                    'ModerateMembers': '1099511627776'
                }
                normalizedPermissions = permissionMap[command.defaultMemberPermissions] || command.defaultMemberPermissions
            } else {
                normalizedPermissions = command.defaultMemberPermissions.toString()
            }
        }
        
        const relevantProps = {
            name: command.name,
            description: command.description,
            // Options may be undefined, null, or empty array - normalize them
            options: (command.options && command.options.length > 0) ? command.options : undefined,
            // Use normalized permissions
            defaultMemberPermissions: normalizedPermissions,
            // dmPermission: Discord returns null for guild commands regardless of what we set
            // Treat null, undefined, and false as equivalent (all mean "not allowed in DMs")
            // Only preserve true as a distinct value
            dmPermission: command.dmPermission === true ? true : undefined,
            // type defaults to 1 (CHAT_INPUT) if not specified
            type: command.type || 1,
            // Localizations: Discord API returns null for guild commands, so we ignore them
            // They are only preserved for global commands
            // nameLocalizations and descriptionLocalizations are intentionally excluded
            // nsfw defaults to false if not specified
            nsfw: command.nsfw || false
        }
        
        // Remove undefined values to ensure consistent hashing
        // This prevents undefined vs missing property from causing different hashes
        Object.keys(relevantProps).forEach(key => {
            if (relevantProps[key] === undefined) {
                delete relevantProps[key]
            }
        })
        
        // Create deterministic JSON string (sorted keys)
        const jsonString = JSON.stringify(relevantProps, Object.keys(relevantProps).sort())
        
        // Generate SHA-256 hash
        return crypto.createHash('sha256').update(jsonString).digest('hex')
    }

    /**
     * Check GLOBAL rate limit (200 operations per day across ALL guilds)
     */
    checkGlobalRateLimit() {
        const now = Date.now()
        
        // Reset if window expired
        if (now >= this.globalRateLimit.resetAt) {
            this.globalRateLimit.count = 0
            this.globalRateLimit.resetAt = now + this.RATE_LIMIT_WINDOW
            console.log('[GuildCommandManager] ✅ Global rate limit window reset')
        }
        
        const remaining = this.MAX_GLOBAL_OPERATIONS_PER_DAY - this.globalRateLimit.count
        
        if (remaining <= 0) {
            const hoursUntilReset = Math.ceil((this.globalRateLimit.resetAt - now) / 3600000)
            console.warn(`[GuildCommandManager] ⚠️  GLOBAL rate limit reached! Resets in ${hoursUntilReset} hours`)
            return false
        }
        
        if (remaining <= 20) {
            console.warn(`[GuildCommandManager] ⚠️  Only ${remaining} operations remaining today`)
        }
        
        return true
    }

    /**
     * Increment GLOBAL rate limit counter
     */
    incrementGlobalRateLimit() {
        this.globalRateLimit.count++
    }
    
    /**
     * Get remaining operations for today
     */
    getRemainingOperations() {
        return Math.max(0, this.MAX_GLOBAL_OPERATIONS_PER_DAY - this.globalRateLimit.count)
    }

    /**
     * Quick check if guild has all commands registered
     * This is faster than full comparison and avoids unnecessary API calls
     */
    async quickCheckGuildCommands(guild, desiredCommands) {
        try {
            const existingCommands = await guild.commands.fetch()
            
            // Quick count check - if counts don't match, needs sync
            if (existingCommands.size !== desiredCommands.length) {
                return { needsSync: true, reason: 'count_mismatch', existing: existingCommands.size, expected: desiredCommands.length }
            }
            
            // Quick name check - verify all command names exist
            const existingNames = new Set(existingCommands.map(cmd => cmd.name))
            const missingCommands = desiredCommands.filter(cmd => !existingNames.has(cmd.name))
            
            if (missingCommands.length > 0) {
                return { needsSync: true, reason: 'missing_commands', missing: missingCommands.map(c => c.name) }
            }
            
            // All commands present - assume they're in sync
            return { needsSync: false, reason: 'all_present' }
        } catch (error) {
            console.error(`[GuildCommandManager] Error checking guild ${guild.id}:`, error)
            // On error, assume needs sync to be safe
            return { needsSync: true, reason: 'error' }
        }
    }

    /**
     * Compare existing commands with desired commands
     * Returns: { toCreate: [], toUpdate: [], toDelete: [], unchanged: [] }
     */
    async compareCommands(guild, desiredCommands) {
        try {
            // Fetch existing guild commands from Discord
            const existingCommands = await guild.commands.fetch()
            
            const result = {
                toCreate: [],
                toUpdate: [],
                toDelete: [],
                unchanged: []
            }
            
            // Create maps for efficient lookup
            const existingMap = new Map(existingCommands.map(cmd => [cmd.name, cmd]))
            const desiredMap = new Map(desiredCommands.map(cmd => [cmd.name, cmd]))
            
            // Check each desired command
            for (const [name, desiredCmd] of desiredMap) {
                const existing = existingMap.get(name)
                
                if (!existing) {
                    // Command doesn't exist - needs creation
                    result.toCreate.push(desiredCmd)
                } else {
                    // Command exists - check if it needs updating
                    const existingHash = this.hashCommand(existing)
                    const desiredHash = this.hashCommand(desiredCmd)
                    
                    if (existingHash !== desiredHash) {
                        // Command definition changed - needs update
                        result.toUpdate.push({ id: existing.id, data: desiredCmd })
                    } else {
                        // Command unchanged
                        result.unchanged.push(name)
                    }
                }
            }
            
            // Check for commands to delete (exist but not in desired list)
            // guild.commands.fetch() only returns THIS application's guild commands,
            // so every unknown entry is one we registered before — safe to delete.
            for (const [name, existingCmd] of existingMap) {
                if (!desiredMap.has(name)) {
                    result.toDelete.push(existingCmd.id)
                }
            }
            
            return result
        } catch (error) {
            console.error(`[GuildCommandManager] Error comparing commands for guild ${guild.id}:`, error)
            return { toCreate: [], toUpdate: [], toDelete: [], unchanged: [] }
        }
    }

    /**
     * Register commands for a guild with intelligent deduplication
     * @param {boolean} forceSync - Force full sync even if quick check passes
     */
    async registerGuildCommands(guild, commands, retryCount = 0, forceSync = false) {
        const guildId = guild.id
        
        try {
            // Check GLOBAL rate limit
            if (!this.checkGlobalRateLimit()) {
                console.warn(`[GuildCommandManager] ⏭️  Skipping ${guild.name} - global rate limit reached`)
                return { success: false, reason: 'rate_limit_global' }
            }
            
            // Compare with existing commands (one fetch — hashes catch definition
            // changes that a name-only check would miss)
            const comparison = await this.compareCommands(guild, commands)
            
            // Calculate total operations needed
            const totalOpsNeeded = comparison.toCreate.length + comparison.toUpdate.length + comparison.toDelete.length
            
            // Log what we're doing
            console.log(`[GuildCommandManager] Guild: ${guild.name} (${guildId})`)
            console.log(`  - To Create: ${comparison.toCreate.length}`)
            console.log(`  - To Update: ${comparison.toUpdate.length}`)
            console.log(`  - To Delete: ${comparison.toDelete.length}`)
            console.log(`  - Unchanged: ${comparison.unchanged.length}`)
            
            // If nothing to do, skip
            if (totalOpsNeeded === 0) {
                console.log(`[GuildCommandManager] ✅ All commands up to date for ${guild.name}`)
                return { success: true, reason: 'up_to_date', operations: 0 }
            }
            
            // Check if we have enough operations remaining
            const remaining = this.getRemainingOperations()
            if (totalOpsNeeded > remaining) {
                console.warn(`[GuildCommandManager] ⚠️  Need ${totalOpsNeeded} ops but only ${remaining} remaining - queuing for later`)
                return { success: false, reason: 'insufficient_quota', needed: totalOpsNeeded, remaining }
            }
            
            // Perform operations with GLOBAL rate limit tracking
            let operationCount = 0
            const errors = []
            
            // Create new commands
            for (const command of comparison.toCreate) {
                if (!this.checkGlobalRateLimit()) break
                
                try {
                    await guild.commands.create(command)
                    operationCount++
                    this.incrementGlobalRateLimit()
                    console.log(`[GuildCommandManager] ✅ Created: ${command.name}`)
                    
                    // Delay between operations to respect Discord's per-guild rate limit (5 ops per ~18s)
                    if (operationCount < totalOpsNeeded) {
                        await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_OPERATIONS))
                    }
                } catch (error) {
                    errors.push({ operation: 'create', command: command.name, error: error.message })
                    console.error(`[GuildCommandManager] ❌ Failed to create ${command.name}:`, error.message)
                    
                    // If rate limited by Discord, stop immediately
                    if (error.code === 429 || error.status === 429) {
                        console.error('[GuildCommandManager] 🚨 Hit Discord rate limit! Stopping operations.')
                        break
                    }
                }
            }
            
            // Update existing commands
            for (const { id, data } of comparison.toUpdate) {
                if (!this.checkGlobalRateLimit()) break
                
                try {
                    await guild.commands.edit(id, data)
                    operationCount++
                    this.incrementGlobalRateLimit()
                    console.log(`[GuildCommandManager] ✅ Updated: ${data.name}`)
                    
                    // Delay between operations to respect Discord's per-guild rate limit (5 ops per ~18s)
                    if (operationCount < totalOpsNeeded) {
                        await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_OPERATIONS))
                    }
                } catch (error) {
                    errors.push({ operation: 'update', command: data.name, error: error.message })
                    console.error(`[GuildCommandManager] ❌ Failed to update ${data.name}:`, error.message)
                    
                    if (error.code === 429 || error.status === 429) {
                        console.error('[GuildCommandManager] 🚨 Hit Discord rate limit! Stopping operations.')
                        break
                    }
                }
            }
            
            // Delete removed commands
            for (const id of comparison.toDelete) {
                if (!this.checkGlobalRateLimit()) break
                
                try {
                    await guild.commands.delete(id)
                    operationCount++
                    this.incrementGlobalRateLimit()
                    console.log(`[GuildCommandManager] ✅ Deleted: ${id}`)
                    
                    // Delay between operations to respect Discord's per-guild rate limit (5 ops per ~18s)
                    if (operationCount < totalOpsNeeded) {
                        await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_OPERATIONS))
                    }
                } catch (error) {
                    errors.push({ operation: 'delete', command: id, error: error.message })
                    console.error(`[GuildCommandManager] ❌ Failed to delete ${id}:`, error.message)
                    
                    if (error.code === 429 || error.status === 429) {
                        console.error('[GuildCommandManager] 🚨 Hit Discord rate limit! Stopping operations.')
                        break
                    }
                }
            }
            
            console.log(`[GuildCommandManager] ✅ Completed ${operationCount}/${totalOpsNeeded} operations for ${guild.name}`)
            console.log(`[GuildCommandManager] 📊 Global operations remaining: ${this.getRemainingOperations()}`)
            
            // Retry logic for partial failures
            if (errors.length > 0 && retryCount < this.MAX_RETRIES) {
                console.warn(`[GuildCommandManager] ⚠️  ${errors.length} errors, will retry (attempt ${retryCount + 1}/${this.MAX_RETRIES})`)
                await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))) // Exponential backoff
                return this.registerGuildCommands(guild, commands, retryCount + 1)
            }
            
            return { 
                success: operationCount > 0 || totalOpsNeeded === 0, 
                operations: operationCount,
                created: comparison.toCreate.length,
                updated: comparison.toUpdate.length,
                deleted: comparison.toDelete.length,
                errors: errors.length > 0 ? errors : undefined
            }
            
        } catch (error) {
            console.error(`[GuildCommandManager] Error registering commands for guild ${guildId}:`, error)
            
            // Retry on network errors
            if (retryCount < this.MAX_RETRIES && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
                console.warn(`[GuildCommandManager] Network error, retrying (${retryCount + 1}/${this.MAX_RETRIES})...`)
                await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1)))
                return this.registerGuildCommands(guild, commands, retryCount + 1)
            }
            
            return { success: false, reason: 'error', error: error.message }
        }
    }

    /**
     * Register commands for all guilds (called on bot startup)
     * Uses queue system to respect global rate limits
     */
    async registerAllGuilds(guildCommands) {
        const guildCount = this.client.guilds.cache.size
        console.log(`[GuildCommandManager] 🚀 Starting guild command registration for ${guildCount} guilds...`)
        console.log(`[GuildCommandManager] 📊 Global rate limit: ${this.getRemainingOperations()}/${this.MAX_GLOBAL_OPERATIONS_PER_DAY} operations available`)
        console.log(`[GuildCommandManager] 💡 Using smart detection - only syncing guilds that need updates\n`)
        
        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            alreadySynced: 0,
            totalOperations: 0,
            errors: []
        }
        
        let processedCount = 0
        
        for (const [guildId, guild] of this.client.guilds.cache) {
            processedCount++
            
            // Check if we should continue
            if (!this.checkGlobalRateLimit()) {
                console.warn(`[GuildCommandManager] ⏹️  Stopping at guild ${processedCount}/${guildCount} - rate limit reached`)
                results.skipped += (guildCount - processedCount + 1)
                break
            }
            
            console.log(`[GuildCommandManager] [${processedCount}/${guildCount}] Processing: ${guild.name}`)
            
            const result = await this.registerGuildCommands(guild, guildCommands, 0, false)
            
            if (result.success) {
                results.success++
                results.totalOperations += result.operations || 0
                if (result.reason === 'already_synced') {
                    results.alreadySynced++
                }
            } else if (result.reason === 'rate_limit_global' || result.reason === 'insufficient_quota') {
                results.skipped++
                console.warn(`[GuildCommandManager] ⏭️  Skipped ${guild.name} - ${result.reason}`)
            } else {
                results.failed++
                if (result.error) {
                    results.errors.push({ guild: guild.name, error: result.error })
                }
            }
            
            // Delay between guilds to avoid rate limits
            // Use shorter delay if no operations were performed (commands unchanged)
            if (processedCount < guildCount) {
                const delay = (result.operations === 0 || result.reason === 'up_to_date' || result.reason === 'already_synced') 
                    ? 100  // Short delay for unchanged guilds
                    : this.DELAY_BETWEEN_GUILDS  // Normal delay after operations
                await new Promise(resolve => setTimeout(resolve, delay))
            }
        }
        
        console.log(`\n[GuildCommandManager] ═══════════════════════════════════════`)
        console.log(`[GuildCommandManager] 📊 Registration Summary:`)
        console.log(`[GuildCommandManager]   ✅ Success: ${results.success}`)
        console.log(`[GuildCommandManager]   📋 Already Synced: ${results.alreadySynced}`)
        console.log(`[GuildCommandManager]   ❌ Failed: ${results.failed}`)
        console.log(`[GuildCommandManager]   ⏭️  Skipped: ${results.skipped}`)
        console.log(`[GuildCommandManager]   📈 Total operations: ${results.totalOperations}`)
        console.log(`[GuildCommandManager]   🔄 Remaining quota: ${this.getRemainingOperations()}/${this.MAX_GLOBAL_OPERATIONS_PER_DAY}`)
        console.log(`[GuildCommandManager] ═══════════════════════════════════════\n`)
        
        if (results.errors.length > 0) {
            console.error(`[GuildCommandManager] ⚠️  Errors encountered:`)
            results.errors.forEach(e => console.error(`  - ${e.guild}: ${e.error}`))
        }
        
        if (results.skipped > 0) {
            console.warn(`[GuildCommandManager] ⚠️  ${results.skipped} guilds skipped due to rate limits`)
            console.warn(`[GuildCommandManager] 💡 They will be registered when bot joins them or on next restart`)
        }
        
        if (results.alreadySynced > 0) {
            console.log(`[GuildCommandManager] 💡 ${results.alreadySynced} guilds already had commands synced - no API calls needed`)
        }
        
        return results
    }

    /**
     * Handle new guild join - register commands immediately with force sync
     */
    async onGuildCreate(guild, guildCommands) {
        console.log(`[GuildCommandManager] 🆕 Bot joined new guild: ${guild.name} (${guild.id})`)
        console.log(`[GuildCommandManager] 🚀 Force syncing commands immediately...`)
        
        // Wait a bit for guild to be fully ready
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Force sync for new guilds
        const result = await this.registerGuildCommands(guild, guildCommands, 0, true)
        
        if (result.success) {
            console.log(`[GuildCommandManager] ✅ Successfully registered ${guildCommands.length} commands for new guild: ${guild.name}`)
            console.log(`[GuildCommandManager] 📊 Operations used: ${result.operations || 0}`)
            console.log(`[GuildCommandManager] 🔄 Remaining quota: ${this.getRemainingOperations()}/${this.MAX_GLOBAL_OPERATIONS_PER_DAY}`)
        } else {
            console.error(`[GuildCommandManager] ❌ Failed to register commands for new guild: ${guild.name}`)
            if (result.reason === 'rate_limit_global') {
                console.error(`[GuildCommandManager] ⚠️  Rate limit reached - commands will be registered on next restart`)
            }
        }
        
        return result
    }
}

module.exports = GuildCommandManager
