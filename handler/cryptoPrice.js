/**
 * Crypto price helper with a short in-memory TTL cache.
 * Coinbase's public API rate-limits aggressively; autocomplete handlers fire
 * on every keystroke, so we cache each pair/side for TTL_MS.
 */
const TTL_MS = 30_000
const priceCache = new Map() // `${pair}:${side}` -> { amount, at }

/**
 * Fetch the Coinbase spot price for a pair.
 * @param {string} pair - e.g. "BTC-USD"
 * @param {'buy'|'sell'} side
 * @returns {Promise<number>} price amount, NaN on failure
 */
async function getCryptoPrice(pair, side = 'buy') {
    const key = `${pair}:${side}`
    const cached = priceCache.get(key)
    if (cached && Date.now() - cached.at < TTL_MS) return cached.amount
    const amount = await fetch(`https://api.coinbase.com/v2/prices/${pair}/${side}`)
        .then(r => r.json())
        .then(r => +r.data.amount)
        .catch(() => NaN)
    if (!isNaN(amount)) priceCache.set(key, { amount, at: Date.now() })
    return amount
}

module.exports = { getCryptoPrice }
