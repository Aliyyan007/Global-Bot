const { Schema, model, models } = require('mongoose')
const rolePropertiesSchema = new Schema({
    guildID: { type: String, require: true },
    id: { type: String, require: true, unique: true },
    canUnwear: { type: Boolean },
    cannotTransfer: { type: Boolean },
    cannotSell: { type: Boolean },
    cannotGiveaway: { type: Boolean },
    cannotAuction: { type: Boolean }
})
const name = "roles_properties"
module.exports = models[name] || model(name, rolePropertiesSchema)