const { Schema, model, models } = require('mongoose')
const categorySchema = new Schema({
    categoryID: { type: String, required: true, unique: true },
    guildID: { type: String, required: true },
    name: { type: String, required: true },
    emoji: { type: String },
    default: { type: Boolean, default: false },
    items: []
})
categorySchema.index({ name: 1, guildID: 1 }, { unique: true })
const name = "categories"
module.exports = models[name] || model(name, categorySchema)
