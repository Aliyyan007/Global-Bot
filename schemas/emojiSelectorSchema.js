const { Schema, model, models } = require('mongoose')
const emojiSelectorSchema = new Schema({
    id: { type: String, required: true, unique: true },
    guildID: { type: String, required: true },
    filter_name: { type: String },
    filter_guild_id: { type: String },
    select_for: { type: String },
    select_for_id: { type: String },
    deleteDate: { type: Date }
})
const name = "emoji_selectors"
module.exports = models[name] || model(name, emojiSelectorSchema)
