const emojiSelectorSchema = require("../schemas/emojiSelectorSchema.js")
const lt = require('long-timeout')
class EmojiSelector {
	constructor(client, selector) {
        this.client = client
        this.id = selector.id
        this.guildID = selector.guildID
        this.filter_name = selector.filter_name
        this.filter_guild_id = selector.filter_guild_id
        this.select_for = selector.select_for
        this.select_for_id = selector.select_for_id
        this.deleteDate = selector.deleteDate
    }
    async save() {
        await emojiSelectorSchema.replaceOne({ id: this.id }, Object.assign({}, { ...this, client: undefined, timeoutDeleteId: undefined }), { upsert: true })
    }
    async delete() {
        if (this.timeoutDeleteId) this.timeoutDeleteId = undefined
        this.client.cache.emojiSelectors.delete(this.id)
        await emojiSelectorSchema.deleteOne({ id: this.id })
    }
    setTimeoutDelete() {
        this.timeoutDeleteId = lt.setTimeout(async () => {
            this.delete()
        }, this.deleteDate.getTime() - Date.now())
    }
    clearTimeoutDelete() {
        lt.clearTimeout(this.timeoutDeleteId)
        delete this.timeoutDeleteId
    }
}
module.exports = EmojiSelector