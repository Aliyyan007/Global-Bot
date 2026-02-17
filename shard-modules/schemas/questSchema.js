const { Schema, model, models } = require('mongoose')
const questSchema = new Schema({
    questID: { type: String, require: true, unique: true },
    guildID: { type: String, require: true },
    name: { type: String, require: true },
    emoji: { type: String, require: true },
    description: { type: String },
    image: { type: String },
    hex: { type: String },
    targets: [{
        targetID: { type: String },
        amount: { type: Number },
        finished: { type: Boolean },
        reached: { type: Number },
        type: { type: String },
        object: { type: String },
        description: { type: String },
        showProgressBar: { type: Boolean },
        isOptional: { type: Boolean },
        optionalRewards: [{
            type: { type: Number },
            id: { type: String },
            amount: { type: Number },
            ms: { type: Number }
        }]
    }],
    rewards: [{
        type: { type: Number },
        id: { type: String },
        amount: { type: Number }
    }],
    daily: { type: Boolean, default: false },
    weekly: { type: Boolean, default: false },
    community: { type: Boolean, default: false },
    repeated: { type: Boolean, default: false },
    enable: { type: Boolean, default: false },
    active: { type: Boolean, default: false },
    takePermission: { type: String },
    donePermission: { type: String },
    nextQuests: [],
    requiresAllTasks: { type: Boolean, default: true }
})
questSchema.index({ name: 1, guildID: 1 }, { unique: true })
const name = "quests"
module.exports = models[name] || model(name, questSchema)