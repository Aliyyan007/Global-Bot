const mongoose = require('mongoose')

class DatabaseManager {
    constructor() {
        this.primaryConnection = null
        this.secondaryConnection = null
        this.schemas = {}
        this.secondaryInitialized = false
    }

    async connectPrimary() {
        try {
            mongoose.set("strictQuery", true)
            this.primaryConnection = await mongoose.connect(process.env.mongoDB_SRV, {
                keepAlive: true,
                useNewUrlParser: true,
                useUnifiedTopology: true,
            })
            
            if (this.primaryConnection?.connections?.[0]) {
                const conn = this.primaryConnection.connections[0]
                console.log(`[Primary DB] Connected to ${conn.name} (${conn.host}:${conn.port})`)
            }
            return true
        } catch (error) {
            console.error('[Primary DB] Connection failed:', error.message)
            return false
        }
    }

    async connectSecondary() {
        if (!process.env.mongoDB_SRV_SECONDARY || 
            process.env.mongoDB_SRV_SECONDARY.includes('your-second-cluster')) {
            console.log('[Secondary DB] No secondary database configured, skipping...')
            return false
        }

        // Prevent double initialization
        if (this.secondaryInitialized) {
            return true
        }
        this.secondaryInitialized = true

        try {
            this.secondaryConnection = await mongoose.createConnection(process.env.mongoDB_SRV_SECONDARY, {
                keepAlive: true,
                bufferCommands: false,
            })

            // Wait for connection to be fully ready
            await new Promise((resolve) => {
                if (this.secondaryConnection.readyState === 1) {
                    resolve()
                } else {
                    this.secondaryConnection.once('open', resolve)
                }
            })

            const dbName = this.secondaryConnection.db?.databaseName || this.secondaryConnection.name || 'secondary'
            console.log(`[Secondary DB] Connected to ${dbName} (${this.secondaryConnection.host}:${this.secondaryConnection.port})`)

            this.secondaryConnection.on('error', (err) => {
                console.error('[Secondary DB] Connection error:', err.message)
            })

            // Initialize secondary schemas after connection is ready
            try {
                this.initSecondarySchemas()
            } catch (schemaError) {
                console.error('[Secondary DB] Schema init warning:', schemaError.message)
            }
            return true
        } catch (error) {
            console.error('[Secondary DB] Connection failed:', error.message)
            this.secondaryInitialized = false
            return false
        }
    }

    initSecondarySchemas() {
        // Prevent double initialization
        if (this.schemas.economyLog) {
            return
        }

        // Economy logs schema - for tracking all economy transactions
        const economyLogSchema = new mongoose.Schema({
            guildID: { type: String, required: true, index: true },
            userID: { type: String, required: true, index: true },
            action: { type: String, required: true }, // 'add', 'remove', 'transfer', 'purchase', etc.
            amount: { type: Number, required: true },
            currency: { type: String, default: 'currency' },
            reason: { type: String },
            targetUserID: { type: String },
            metadata: { type: Object },
            timestamp: { type: Date, default: Date.now, index: true }
        })
        economyLogSchema.index({ guildID: 1, timestamp: -1 })

        // Command usage analytics
        const commandAnalyticsSchema = new mongoose.Schema({
            guildID: { type: String, required: true, index: true },
            userID: { type: String, required: true },
            command: { type: String, required: true, index: true },
            executionTime: { type: Number },
            success: { type: Boolean, default: true },
            errorMessage: { type: String },
            timestamp: { type: Date, default: Date.now, index: true }
        })
        commandAnalyticsSchema.index({ guildID: 1, command: 1, timestamp: -1 })

        // Backup/audit schema for important data changes
        const auditLogSchema = new mongoose.Schema({
            guildID: { type: String, required: true, index: true },
            userID: { type: String },
            action: { type: String, required: true },
            collectionName: { type: String, required: true },
            documentId: { type: String },
            before: { type: Object },
            after: { type: Object },
            timestamp: { type: Date, default: Date.now, index: true }
        }, { suppressReservedKeysWarning: true })
        auditLogSchema.index({ guildID: 1, timestamp: -1 })

        this.schemas.economyLog = this.secondaryConnection.model('economyLogs', economyLogSchema)
        this.schemas.commandAnalytics = this.secondaryConnection.model('commandAnalytics', commandAnalyticsSchema)
        this.schemas.auditLog = this.secondaryConnection.model('auditLogs', auditLogSchema)
    }

    // Economy logging methods
    async logEconomy(guildID, userID, action, amount, options = {}) {
        if (!this.secondaryConnection) return null
        try {
            return await this.schemas.economyLog.create({
                guildID,
                userID,
                action,
                amount,
                currency: options.currency || 'currency',
                reason: options.reason,
                targetUserID: options.targetUserID,
                metadata: options.metadata
            })
        } catch (error) {
            console.error('[Secondary DB] Economy log error:', error.message)
            return null
        }
    }

    // Command analytics methods
    async logCommand(guildID, userID, command, options = {}) {
        if (!this.secondaryConnection) return null
        try {
            return await this.schemas.commandAnalytics.create({
                guildID,
                userID,
                command,
                executionTime: options.executionTime,
                success: options.success !== false,
                errorMessage: options.errorMessage
            })
        } catch (error) {
            console.error('[Secondary DB] Command log error:', error.message)
            return null
        }
    }

    // Audit log methods
    async logAudit(guildID, action, collectionName, options = {}) {
        if (!this.secondaryConnection) return null
        try {
            return await this.schemas.auditLog.create({
                guildID,
                userID: options.userID,
                action,
                collectionName,
                documentId: options.documentId,
                before: options.before,
                after: options.after
            })
        } catch (error) {
            console.error('[Secondary DB] Audit log error:', error.message)
            return null
        }
    }

    // Query methods for analytics
    async getEconomyLogs(guildID, options = {}) {
        if (!this.secondaryConnection) return []
        const query = { guildID }
        if (options.userID) query.userID = options.userID
        if (options.action) query.action = options.action
        
        return this.schemas.economyLog
            .find(query)
            .sort({ timestamp: -1 })
            .limit(options.limit || 100)
            .lean()
    }

    async getCommandStats(guildID, options = {}) {
        if (!this.secondaryConnection) return []
        const match = { guildID }
        if (options.command) match.command = options.command

        return this.schemas.commandAnalytics.aggregate([
            { $match: match },
            { $group: {
                _id: '$command',
                count: { $sum: 1 },
                avgExecutionTime: { $avg: '$executionTime' },
                successRate: { $avg: { $cond: ['$success', 1, 0] } }
            }},
            { $sort: { count: -1 } },
            { $limit: options.limit || 50 }
        ])
    }

    // Health check
    async healthCheck() {
        const status = {
            primary: this.primaryConnection?.connections?.[0]?.readyState === 1,
            secondary: this.secondaryConnection?.readyState === 1
        }
        return status
    }

    // Graceful disconnect
    async disconnect() {
        if (this.secondaryConnection) {
            await this.secondaryConnection.close()
            console.log('[Secondary DB] Disconnected')
        }
        if (this.primaryConnection) {
            await mongoose.disconnect()
            console.log('[Primary DB] Disconnected')
        }
    }
}

module.exports = new DatabaseManager()
