const { Schema, model, models } = require('mongoose')

const stickyCommandSchema = new Schema({
    guildID: { type: String, required: true },
    channelID: { type: String, required: true },
    commandName: { type: String, required: true },
    messageID: { type: String },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, required: true },
    // New fields for unified sticky command manager
    embedMessage: {
        content: { type: String, default: null },
        embed: { type: Object, default: null }
    },
    cooldown: { type: Number, default: null },  // Cooldown in milliseconds
    requirements: [{ type: String }]            // Array of requirement IDs
})

// Compound index to ensure unique combination of guild, channel, and command
stickyCommandSchema.index({ guildID: 1, channelID: 1, commandName: 1 }, { unique: true })

const name = "stickyCommands"
module.exports = models[name] || model(name, stickyCommandSchema)
