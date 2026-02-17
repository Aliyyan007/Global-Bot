const { Schema, model, models } = require('mongoose')
const wormholeStyleSchema = new Schema({
	guildID: { type: String, require: true },
    styleID:  { type: String, require: true, unique: true },
    styleName: { type: String, require: true },
    appearance: {
        author: {
            name: { type: String },
            iconURL: { type: String }
        },
        description: { type: String },
        footer: {
            text: { type: String },
            iconURL: { type: String }
        },
        thumbnailURL: { type: String },
        imageURL: { type: String },
        color: { type: String },
        title: { type: String },
        button: {
            label: { type: String },
            style: { type: String },
            emoji: { type: String }
        }    
    },
    collect: {
        author: {
            name: { type: String },
            iconURL: { type: String }
        },
        description: { type: String },
        footer: {
            text: { type: String },
            iconURL: { type: String }
        },
        thumbnailURL: { type: String },
        imageURL: { type: String },
        color: { type: String },
        title: { type: String },
    }
})
const name = "wormholesstyles"
module.exports = models[name] || model(name, wormholeStyleSchema)