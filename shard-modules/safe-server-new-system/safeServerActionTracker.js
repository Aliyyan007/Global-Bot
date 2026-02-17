/**
 * Safe-Server Action Tracker
 * Tracks moderator actions and checks against limits
 */

const safeServerSchema = require('../schemas/safeServerSchema')

class SafeServerActionTracker {
    constructor() {
        // In-memory action tracking: { guildId: { userId: { actionType: [timestamps] } } }
        this.actions = new Map()
        
        // Cleanup old entries every 5 minutes
        setInterval(() => this.cleanup(), 300000)
    }

    /**
     * Track an action performed by a moderator
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     * @param {string} targetId 
     * @returns {Promise<boolean>} Returns true if limit exceeded
     */
    async trackAction(guildId, userId, actionType, targetId = null) {
        const config = await safeServerSchema.findOne({ guildID: guildId })
        
        if (!config || !config.enabled) {
            return false
        }

        const permConfig = config.permissions[actionType]
        
        if (!permConfig || !permConfig.enabled) {
            return false
        }

        // Check if user is whitelisted (manager roles)
        if (config.managerRoles && config.managerRoles.length > 0) {
            // This check should be done by the caller with member object
            // We'll assume it's already checked
        }

        // Check restriction type
        if (permConfig.restrictionType === 'specific') {
            // Check if user/role is in specific list
            const isSpecific = permConfig.specificUsers.includes(userId)
            // Role check should be done by caller
            
            if (!isSpecific) {
                return false // Not in specific list, don't track
            }
        }

        // Initialize tracking structure
        if (!this.actions.has(guildId)) {
            this.actions.set(guildId, new Map())
        }
        
        const guildActions = this.actions.get(guildId)
        
        if (!guildActions.has(userId)) {
            guildActions.set(userId, new Map())
        }
        
        const userActions = guildActions.get(userId)
        
        if (!userActions.has(actionType)) {
            userActions.set(actionType, [])
        }
        
        const actionList = userActions.get(actionType)
        
        // Add current action
        const now = Date.now()
        actionList.push({ timestamp: now, targetId })
        
        // Remove actions outside the time window
        const timeWindow = permConfig.timeBetweenActions * 1000
        const cutoff = now - timeWindow
        
        const recentActions = actionList.filter(a => a.timestamp > cutoff)
        userActions.set(actionType, recentActions)
        
        // Check if limit exceeded
        const limitExceeded = recentActions.length > permConfig.actionCount
        
        console.log(`[SafeServerTracker] ${userId} performed ${actionType}: ${recentActions.length}/${permConfig.actionCount}`)
        
        return limitExceeded
    }

    /**
     * Get action count for a user
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     * @returns {number}
     */
    getActionCount(guildId, userId, actionType) {
        if (!this.actions.has(guildId)) return 0
        
        const guildActions = this.actions.get(guildId)
        if (!guildActions.has(userId)) return 0
        
        const userActions = guildActions.get(userId)
        if (!userActions.has(actionType)) return 0
        
        return userActions.get(actionType).length
    }

    /**
     * Clear actions for a user (called after restriction expires)
     * @param {string} guildId 
     * @param {string} userId 
     * @param {string} actionType 
     */
    clearActions(guildId, userId, actionType = null) {
        if (!this.actions.has(guildId)) return
        
        const guildActions = this.actions.get(guildId)
        if (!guildActions.has(userId)) return
        
        if (actionType) {
            const userActions = guildActions.get(userId)
            userActions.delete(actionType)
        } else {
            guildActions.delete(userId)
        }
    }

    /**
     * Cleanup old entries
     * @private
     */
    cleanup() {
        const now = Date.now()
        const maxAge = 86400000 // 24 hours
        
        for (const [guildId, guildActions] of this.actions.entries()) {
            for (const [userId, userActions] of guildActions.entries()) {
                for (const [actionType, actionList] of userActions.entries()) {
                    const filtered = actionList.filter(a => now - a.timestamp < maxAge)
                    
                    if (filtered.length === 0) {
                        userActions.delete(actionType)
                    } else {
                        userActions.set(actionType, filtered)
                    }
                }
                
                if (userActions.size === 0) {
                    guildActions.delete(userId)
                }
            }
            
            if (guildActions.size === 0) {
                this.actions.delete(guildId)
            }
        }
    }

    /**
     * Get all actions for debugging
     * @param {string} guildId 
     * @returns {Object}
     */
    getGuildActions(guildId) {
        if (!this.actions.has(guildId)) return {}
        
        const guildActions = this.actions.get(guildId)
        const result = {}
        
        for (const [userId, userActions] of guildActions.entries()) {
            result[userId] = {}
            for (const [actionType, actionList] of userActions.entries()) {
                result[userId][actionType] = actionList.length
            }
        }
        
        return result
    }
}

module.exports = SafeServerActionTracker
