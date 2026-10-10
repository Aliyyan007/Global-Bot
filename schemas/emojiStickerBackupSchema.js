const mongoose = require('mongoose')

/**
 * Emoji/Sticker Backup Schema
 * Stores metadata and B2 URLs for emoji/sticker backups
 * Images are stored in Backblaze B2, not in MongoDB
 */
const emojiStickerBackupSchema = new mongoose.Schema({
    guildID: { 
        type: String, 
        required: true, 
        index: true 
    },
    
    resourceType: { 
        type: String, 
        enum: ['emoji', 'sticker'], 
        required: true,
        index: true
    },
    
    // Discord IDs (currentId changes after recreation)
    originalId: { 
        type: String, 
        required: true 
    },
    currentId: { 
        type: String, 
        required: true,
        index: true
    },
    
    // Core properties
    name: { 
        type: String, 
        required: true 
    },
    
    // Backblaze B2 storage
    b2FileId: { 
        type: String, 
        required: true 
    },
    b2FileName: { 
        type: String, 
        required: true 
    },
    b2DownloadUrl: { 
        type: String, 
        required: true 
    },
    
    // Image metadata
    imageFormat: { 
        type: String, 
        enum: ['PNG', 'GIF', 'APNG', 'LOTTIE'],
        required: true
    },
    imageSize: { 
        type: Number, // Size in bytes
        required: true
    },
    
    // Emoji-specific properties
    animated: { 
        type: Boolean, 
        default: false 
    },
    roles: [{ 
        type: String 
    }], // Role IDs that can use this emoji
    
    // Sticker-specific properties
    description: { 
        type: String 
    },
    tags: { 
        type: String 
    },
    
    // Metadata
    createdAt: { 
        type: Date, 
        default: Date.now,
        index: true
    },
    lastUpdated: { 
        type: Date, 
        default: Date.now 
    },
    recreationCount: { 
        type: Number, 
        default: 0 
    },
    lastRecreatedAt: { 
        type: Date 
    }
})

// Compound indexes for efficient queries
emojiStickerBackupSchema.index({ guildID: 1, currentId: 1 })
emojiStickerBackupSchema.index({ guildID: 1, resourceType: 1 })
emojiStickerBackupSchema.index({ guildID: 1, name: 1 })

module.exports = emojiStickerBackupSchema
