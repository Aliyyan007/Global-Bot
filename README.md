<div align="center">

# 💰 Global Bot

---
# Global — Global Bot

<p align="center">
  <img src="shard-modules/cover_card.png" alt="Global Bot" width="880" />
</p>

[![GitHub stars](https://img.shields.io/github/stars/Aliyyan007/Global-Bot?style=social)](https://github.com/Aliyyan007/Global-Bot/stargazers)
![License](https://img.shields.io/github/license/Aliyyan007/Global-Bot)
![Repo size](https://img.shields.io/github/repo-size/Aliyyan007/Global-Bot)
![Last commit](https://img.shields.io/github/last-commit/Aliyyan007/Global-Bot)

Professional, extensible economy bot for Discord — built with Node.js and MongoDB. This repo contains the Global Bot core and modular subsystems.

---

## Highlights

- Modular architecture: commands, interactions, modules, and events separated for easy extension.
- Production-ready features: marketplace, achievements, promotions, safe-server moderation and more.
- Config-driven: most behavior is adjustable from `config` files and environment variables.

---

## Quick Links

- Invite bot: https://discord.com/oauth2/authorize?client_id=1439541104662937721
- Report bugs / feature requests: https://discord.gg/kaK6JEuRht
- GitHub profile / contact: https://github.com/aliyyan007

---

## Table of contents

1. [Demo & Screenshots](#demo--screenshots)
2. [Requirements](#requirements)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Run & Deploy](#run--deploy)
6. [Development](#development)
7. [Support & Contributing](#support--contributing)
8. [License](#license)

---

## Demo & Screenshots

See the repository image at the top for a quick visual. More screenshots and docs are available in `shard-modules/docs/`.

---

## Requirements

- Node.js v18+ (tested on v22)
- npm
- A MongoDB instance (Atlas or self-hosted)

---

## Installation

1. Clone the repository

```bash
git clone https://github.com/Aliyyan007/Global-Bot.git
cd Global-Bot
```

2. Install dependencies

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill values

```bash
cp .env.example .env
# then edit .env
```

4. Start the bot

```bash
npm start
```

---

## Configuration

- `config/botconfig.js` — main configuration (prefixes, owner id, etc.)
- `.env` — runtime secrets (token, database URI, webhooks)

Important: Do not commit `.env` with secrets. If a secret was accidentally committed, rotate it immediately.

---

## Run & Deploy

- Development: `npm run dev` (if provided in `package.json`)
- Production: `npm start` (use a process manager such as PM2 or a container)

Example systemd or PM2 usage can be added on request.

---

## Development

Project structure (high level):

```
shard-modules/
  ├─ slash-commands/
  ├─ interactions/
  ├─ modules/
  ├─ events/
  └─ config/
index.js
package.json
```

- Add commands under `slash-commands/` following the existing command modules.
- Use `client.config` and `client.language()` helpers to integrate with the bot's configuration and translation system.

---

## Support & Contributing

We welcome contributions. For quick triage and support:

- Report bugs / request features: https://discord.gg/kaK6JEuRht
- Contact / profile: https://github.com/aliyyan007

See `CONTRIBUTING.md` for contribution guidelines and `/.github/ISSUE_TEMPLATE/` for issue templates.

---

## License

This project is licensed under GPL v3. See [LICENSE](LICENSE) for details.

---

If you'd like, I can add a CI workflow, better screenshots, or a demo GIF — tell me which you'd prefer next.
