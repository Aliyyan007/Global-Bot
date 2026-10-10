/**
 * scripts/downloadFonts.js
 *
 * One-shot helper that downloads multilingual Noto Sans fonts into the
 * `fonts/` folder in the project root. The rank-card renderer
 * (`modules/generateRankCard.js`) auto-registers every .ttf / .otf found
 * in that folder, so after running this script once the bot can correctly
 * display Arabic, Urdu, Hindi (Devanagari), Hebrew, Thai, and CJK text
 * on rank cards.
 *
 * Usage (from the project root):
 *     node scripts/downloadFonts.js
 *
 * Re-running is safe — files that already exist are skipped.
 * Network failures are non-fatal; they just print a warning and move on.
 */

const https = require('https')
const fs    = require('fs')
const path  = require('path')

const FONTS_DIR = path.join(process.cwd(), 'fonts')

// All links are pinned to the upstream `notofonts/notofonts.github.io` repo
// (the canonical source of Noto TTFs maintained by the Noto Fonts project).
// Using jsDelivr in front of GitHub for reliable global CDN delivery.
const FONT_FILES = [
    {
        name: 'NotoSans-Regular.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf',
        desc: 'Latin / Cyrillic / Greek core (universal fallback)'
    },
    {
        name: 'NotoSans-Bold.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSans/hinted/ttf/NotoSans-Bold.ttf',
        desc: 'Latin / Cyrillic / Greek (bold)'
    },
    {
        name: 'NotoSansArabic-Regular.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansArabic/hinted/ttf/NotoSansArabic-Regular.ttf',
        desc: 'Arabic + Urdu (shares Arabic script)'
    },
    {
        name: 'NotoSansArabic-Bold.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansArabic/hinted/ttf/NotoSansArabic-Bold.ttf',
        desc: 'Arabic + Urdu (bold)'
    },
    {
        name: 'NotoSansDevanagari-Regular.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansDevanagari/hinted/ttf/NotoSansDevanagari-Regular.ttf',
        desc: 'Hindi / Marathi / Sanskrit (Devanagari)'
    },
    {
        name: 'NotoSansDevanagari-Bold.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansDevanagari/hinted/ttf/NotoSansDevanagari-Bold.ttf',
        desc: 'Hindi / Marathi / Sanskrit (bold)'
    },
    {
        name: 'NotoSansHebrew-Regular.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansHebrew/hinted/ttf/NotoSansHebrew-Regular.ttf',
        desc: 'Hebrew'
    },
    {
        name: 'NotoSansThai-Regular.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansThai/hinted/ttf/NotoSansThai-Regular.ttf',
        desc: 'Thai'
    },
    {
        name: 'NotoSansBengali-Regular.ttf',
        url:  'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@main/fonts/NotoSansBengali/hinted/ttf/NotoSansBengali-Regular.ttf',
        desc: 'Bengali / Assamese'
    }
]

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function download(url, dest, { maxRedirects = 5 } = {}) {
    return new Promise((resolve, reject) => {
        const tryGet = (currentUrl, redirectsLeft) => {
            const req = https.get(currentUrl, { headers: { 'User-Agent': 'rank-card-font-downloader' } }, res => {
                // Follow redirects
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    if (redirectsLeft <= 0) return reject(new Error('Too many redirects'))
                    res.resume()
                    return tryGet(res.headers.location, redirectsLeft - 1)
                }
                if (res.statusCode !== 200) {
                    res.resume()
                    return reject(new Error(`HTTP ${res.statusCode}`))
                }
                const out = fs.createWriteStream(dest)
                res.pipe(out)
                out.on('finish', () => out.close(resolve))
                out.on('error', err => {
                    try { fs.unlinkSync(dest) } catch (_) {}
                    reject(err)
                })
            })
            req.on('error', reject)
            req.setTimeout(30_000, () => {
                req.destroy(new Error('Timeout'))
            })
        }
        tryGet(url, maxRedirects)
    })
}

async function main() {
    ensureDir(FONTS_DIR)
    console.log(`[Fonts] Target directory: ${FONTS_DIR}`)
    console.log('')

    let downloaded = 0, skipped = 0, failed = 0
    for (const f of FONT_FILES) {
        const target = path.join(FONTS_DIR, f.name)
        if (fs.existsSync(target) && fs.statSync(target).size > 10_000) {
            console.log(`  [SKIP] ${f.name.padEnd(34)} — already present`)
            skipped++
            continue
        }
        process.stdout.write(`  [....] ${f.name.padEnd(34)} `)
        try {
            await download(f.url, target)
            const kb = Math.round(fs.statSync(target).size / 1024)
            console.log(`\r  [ OK ] ${f.name.padEnd(34)} ${String(kb).padStart(4)} KB  (${f.desc})`)
            downloaded++
        } catch (err) {
            console.log(`\r  [FAIL] ${f.name.padEnd(34)} ${err.message}`)
            try { fs.unlinkSync(target) } catch (_) {}
            failed++
        }
    }

    console.log('')
    console.log(`[Fonts] ${downloaded} downloaded, ${skipped} already present, ${failed} failed`)
    if (failed > 0) {
        console.log('[Fonts] Failed downloads can be retried by re-running this script.')
        process.exitCode = 1
    } else {
        console.log('[Fonts] Done — restart the bot to pick up the new fonts.')
    }
}

main().catch(e => {
    console.error('[Fonts] Unexpected error:', e)
    process.exit(1)
})
