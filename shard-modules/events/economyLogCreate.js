const client = require("../index")
const { sendWebhook } = require('../handler/httpClient')
const { handleError } = require('../handler/errorHandler')

client.on('economyLogCreate', async (guildId, log) => {
	try {
		const settings = client.cache.settings.find(settings => settings.guildID === guildId)
		if (!settings.logs?.webhook || !settings.logs?.economyLogCreate) return
		try {
			await sendWebhook(settings.logs.webhook, {
				content: log,
				allowed_mentions: {
					parse: []
				}
			})
		} catch (err) {
			if (err.message?.includes("Invalid URI")) {
				settings.logs.webhook = undefined
				await settings.save().catch(e => console.error('Failed to save settings:', e))
			} else client.functions.sendError(err)
		}
	} catch (error) {
		handleError(error, { ownerId: client.config.discord.ownerId, context: 'EconomyLogCreate Event' })
	}
})