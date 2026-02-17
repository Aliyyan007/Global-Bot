const { Schema, model, models } = require('mongoose')
const permissionSchema = new Schema({
    id: { type: String, unique: true, require: true },
    guildID: { type: String, require: true },
    name: { type: String, require: true },
    enable: { type: Boolean, default: true },
    requirements: []
})
permissionSchema.index({ name: 1, guildID: 1 }, { unique: true })
const name = "permissions"
module.exports = models[name] || model(name, permissionSchema)