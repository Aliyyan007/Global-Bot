const { Schema, model, models } = require('mongoose')
const commandUsesSchema = new Schema({
    commandName: { type: String, require: true, unique: true },
    hourly: {
        uses: { type: Number, default: 0 }    
    },
    daily: {
        uses: { type: Number, default: 0 }    
    },
    weekly: {
        uses: { type: Number, default: 0 }    
    },
    monthly: {
        uses: { type: Number, default: 0 }    
    },
    alltime: {
        uses: { type: Number, default: 0 }    
    },
    lastHourUses: { type: Number, default: 0 },
    lastDayUses: { type: Number, default: 0 },
    lastWeekUses: { type: Number, default: 0 },
    lastMonthUses: { type: Number, default: 0 },
})
const name = "commandsUses"
module.exports = models[name] || model(name, commandUsesSchema)