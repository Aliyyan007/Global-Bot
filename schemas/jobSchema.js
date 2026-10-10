const { Schema, model, models } = require('mongoose')
const jobSchema = new Schema({
    id: { type: String, unique: true, required: true },
    guildID: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    hide: { type: Boolean, default: false },
    action1: {
        name: { type: String, required: true },
        permission: { type: String },
        hideChance: { type: Boolean, default: false },
        success: {
            chance: { type: Number, default: 50 },
            messages: [],
            images: [],
            cooldown: { type: Number, default: 43200 },
            cooldownJobs: { type: Number, default: 43200 },
            rewards: [],
            hideRewards: { type: Boolean, default: false },
            hideCooldowns: { type: Boolean, default: false }
        },
        fail: {
            messages: [],
            images: [],
            cooldown: { type: Number, default: 43200 },
            cooldownJobs: { type: Number, default: 43200 },
            rewards: [],
            hideRewards: { type: Boolean, default: false },
            hideCooldowns: { type: Boolean, default: false }
        }
    },
    action2: {
        name: { type: String, required: true },
        permission: { type: String },
        hideChance: { type: Boolean, default: false },
        success: {
            chance: { type: Number, default: 50 },
            messages: [],
            images: [],
            cooldown: { type: Number, default: 43200 },
            cooldownJobs: { type: Number, default: 43200 },
            rewards: [],
            hideRewards: { type: Boolean, default: false },
            hideCooldowns: { type: Boolean, default: false }
        },
        fail: {
            messages: [],
            images: [],
            cooldown: { type: Number, default: 43200 },
            cooldownJobs: { type: Number, default: 43200 },
            rewards: [],
            hideRewards: { type: Boolean, default: false },
            hideCooldowns: { type: Boolean, default: false }
        }
    },
    enable: { type: Boolean, default: false }
})
jobSchema.index({ name: 1, guildID: 1 }, { unique: true })
const name = "jobs"
module.exports = models[name] || model(name, jobSchema)
