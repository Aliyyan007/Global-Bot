# Global Bot

**A full economy + community engine that actually runs your server** — not another bot with a shop. Leveling, currency, voice channels, moderation, giveaways, marketplaces, and a settings panel deep enough that you never touch a config file.

> Built for production: primary + replica MongoDB, Redis-cluster caching with graceful fallback, sharding, atomic persistence, and an auto-voice system that survives restarts. One `.env` and it's alive.

---

## The Big Systems

- 💰 **Full economy** — server currency with custom name/description, shop & inventory, item pricing, drops, transfers with permission gates, crafting, marketplace auctions & lots, promocodes, and a daily reward channel with a claim button.
- 📈 **Leveling that makes sense** — XP/currency/reputation from messages, voice, invites, bumps, likes, and first-item finds — all per-guild configurable. Rank cards rendered with `@napi-rs/canvas` (multilingual fonts supported), leaderboards, and **Roles for Levels** including one-click **Auto Setup** (15 roles spanning levels 1–100).
- 🎙️ **Auto voice channels** — join-to-create with per-user preferences, owner controls (rename/lock/limit/bitrate/trust/region), temp-channel cleanup, LFM boards, and file-backed persistence with atomic writes + boot-time reconciliation. It remembers your setup forever.
- 🛡️ **Real moderation** — safe-moderation restrictions, spam detection → graduated punishments, quarantine auto-cleanup, timed roles, blacklist, and a unified protection system with bot shield.
- 🔔 **Notification channels** — level-up, birthday, welcome, goodbye, and daily-reward announcements, each with custom channel, message/compact-embed/full-embed templates, thumbnails, member counts, and role mentions — configured from a single panel.
- 🎁 **Community** — giveaways, quests, achievements, sticky notes, embed generator, emoji/sticker backup + restore (Backblaze B2), wormhole global chat, and dropdown role menus with cooldowns and item-price gating.
- ⚙️ **`/manager settings`** — one command to rule it all: notification channels, earnings rates & cooldowns, server currency, roles-for-levels, channel routing, and more — with modals, live previews, and sane defaults.

## Architecture

| Piece | Tech |
|---|---|
| Runtime | Node.js ≥20, discord.js 14, sharded (`shard.js`) |
| Databases | MongoDB — primary + optional secondary replica, backup cluster, dedicated auto-voice DB |
| Cache | Redis cluster (3 instances) → **falls back to MongoDB-only mode** if Redis dies |
| Rendering | `@napi-rs/canvas` rank cards, multilingual Noto fonts via `npm run setup` |
| Scheduler | Croner + node-schedule — timed roles, giveaways, cleanups, crypto prices |
| Startup | Every external connection has a failure boundary — one dead dependency can never hang boot |

## Setup

### Requirements
- Node.js 20+
- MongoDB connection string (required) + optional replicas
- Discord bot token with Message Content, Server Members, and Presence intents

### Quick start
```bash
npm install
copy .env.example .env   # fill in discordToken + mongoDB_SRV
npm run setup            # optional: download multilingual rank-card fonts
npm start                # = node shard.js
```

`.env.example` documents everything — only `discordToken` and `mongoDB_SRV` are required. Secondary DB, backup cluster, Redis, B2, Groq, and Unsplash are all optional; the bot degrades gracefully without them.

### Deploy to Render
`render.yaml` included — deploy as a Blueprint and it becomes a **Background Worker** (not a web service) with a persistent disk for `voice_data.json` and all env vars pre-declared. Fill the secrets in the dashboard, done.

> Free-tier note: disks need a paid plan. Remove the `disk:` block if you're on free — everything still works, auto-voice configs just reset on redeploy.

## Find Me / Get Help

**Setup requests, questions, or want to see it live — talk to Aliyyan:**

- 🌐 Portfolio: [aliyyan.com](https://aliyyan.com)
- 💬 Discord: [discord.gg/FvVWf4a7TY](https://discord.gg/FvVWf4a7TY)
- 🐙 GitHub: [@Aliyyan007](https://github.com/Aliyyan007)
- 📸 Instagram: [@aliyyan007](https://instagram.com/aliyyan007)
- 🎮 Steam: [aliyyan007](https://steamcommunity.com/id/aliyyan007)
- 🐦 X: [@aliyyan007](https://x.com/aliyyan007)
- 🎧 Spotify: [Aliyyan](https://open.spotify.com/user/31gjqqqiavkbdsnthiuuim6f734a)

## License

GPL-3.0 — see [LICENSE](LICENSE).

---

*Developer: **Aliyyan** — [aliyyan.com](https://aliyyan.com)*
