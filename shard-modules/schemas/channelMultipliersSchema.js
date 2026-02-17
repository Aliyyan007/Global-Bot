const { Schema, model, models } = require('mongoose')
const channelMultipliersSchema = new Schema({
    id: { type: String, require: true, unique: true },
    guildID: { type: String, require: true },
    xp_multiplier: { type: Number, default: 0 },
    xp_multiplier_for_members: { type: Number, default: 0 },
    cur_multiplier: { type: Number, default: 0 },
    cur_multiplier_for_members: { type: Number, default: 0 },
    rp_multiplier: { type: Number, default: 0 },
    rp_multiplier_for_members: { type: Number, default: 0 },
    luck_multiplier: { type: Number, default: 0 },
    luck_multiplier_for_members: { type: Number, default: 0 },
    xp_max_members_size: { type: Number, default: 0 },
    cur_max_members_size: { type: Number, default: 0 },
    rp_max_members_size: { type: Number, default: 0 },
    xp_min_members_size: { type: Number, default: 0 },
    cur_min_members_size: { type: Number, default: 0 },
    rp_min_members_size: { type: Number, default: 0 },
    luck_min_members_size: { type: Number, default: 0 },
    luck_max_members_size: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true }
})
const name = "channel_multipliers"
module.exports = models[name] || model(name, channelMultipliersSchema)