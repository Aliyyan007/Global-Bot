/**
 * Birthday Scheduler
 *
 * Runs once per UTC day: finds every profile whose birthday matches today
 * and dispatches the configured birthday notification for their guild.
 * Profiles store birthday_day / birthday_month per guild.
 */

const { sendBirthdayNotification } = require('./notificationDispatcher')

const CHECK_INTERVAL_MS = 60 * 60 * 1000 // hourly; the day-stamp dedupes sends

async function runBirthdayCheck(client) {
    const now = new Date()
    const day = now.getUTCDate()
    const month = now.getUTCMonth() + 1
    const stamp = `${now.getUTCFullYear()}-${month}-${day}`
    if (client._birthdayStamp === stamp) return
    client._birthdayStamp = stamp

    const profiles = await client.profileSchema.find({ birthday_day: day, birthday_month: month }).lean().catch(() => [])
    for (const doc of profiles) {
        try {
            const guild = client.guilds.cache.get(doc.guildID) || await client.guilds.fetch(doc.guildID).catch(() => null)
            if (!guild) continue
            const member = await guild.members.fetch(doc.userID).catch(() => null)
            if (!member) continue
            await sendBirthdayNotification(guild.id, member, client)
        } catch (e) {
            console.error(`[Birthday] Failed for ${doc.userID} in ${doc.guildID}:`, e.message)
        }
    }
}

function start(client) {
    runBirthdayCheck(client).catch(e => console.error('[Birthday] Check failed:', e))
    setInterval(() => runBirthdayCheck(client).catch(e => console.error('[Birthday] Check failed:', e)), CHECK_INTERVAL_MS)
    console.log('[Birthday] Scheduler started (daily check)')
}

module.exports = { start, runBirthdayCheck }
