const { Schema, model, models } = require('mongoose')
const wormholeStyleSchema = new Schema({
	guildID: { type: String, required: true },
    styleID:  { type: String, required: true, unique: true },
    styleName: { type: String, required: true },
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
