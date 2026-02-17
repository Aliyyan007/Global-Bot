<div align="center">

# 💰 Global Bot

**A powerful economy bot for Discord with a unique system and fine-tuned customization**

[![Node.js Version](https://img.shields.io/badge/Node.js-22.12.0+-green?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?logo=mongodb)](https://mongodb.com)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

[Installation](#-installation) • [Usage](#-usage) • [Configuration](#-configuration) • [Development](#-development)

</div>

# 🎩✨ Global Bot – Your Virtual Economy Universe! ✨🎩

Welcome to the future of Discord economy! **Global Bot** is not just a bot, it's a powerful constructor that will transform your server into a living, breathing ecosystem with its own economy, rare items, and engaging gamification. Get ready for the magic! 🪄

---

## 🎁 **Magical Inventory & Items**

Create unique items with incredible depth of interaction!

* **🛍️ Creation:** Give an item a name, description, rarity (from common `🟢` to legendary `🟣`) and a unique icon.
* **🎯 Usage:** Items can give currency, temporary roles, bonuses, or even trigger mini-events.
* **🎁 Containers (Lootboxes):** Create mysterious chests that can be **opened** 🎊! Inside — a random set of other items, creating excitement and intrigue.
* **💰 Economy:** Items can be **sold** on the market, **transferred** to friends, or traded.

## 🏆 **Achievement & Reward System**

Reward activity and mastery of your members!

* **📛 Creating achievements:** Rewards for first message, event participation, item collecting, or any other activity.
* **💎 Valuable rewards:** Upon completing an achievement, the user instantly receives your assigned reward: **virtual currency**, **exclusive role** 🎭 or **rare item** directly to their inventory!

## ⚙️ **Powerful Tools & Activities**

Full control over your server's economy is in your hands!

* **🎉 Giveaways:** Simple and stylish raffles of items or currency among participants.
* **⚖️ Auctions:** Exciting bidding where participants compete for unique lots, raising bids until the last second!
* **🏪 Marketplace:** Create static **lots** where users can buy and sell items for a set price.
* **💼 Jobs:** A realistic profession system. Participants can "get a job" and use commands to receive regular salary. 💰
* **🏦 Income Roles:** Assign special roles whose owners will receive passive income — regular currency payments just for having them.

## 🗺️ **Advanced Systems & Automation**

* **🧩 Quests:** Create task chains (`🔹 Collect 10 apples -> 🔹 Eat them -> 🏆 Get reward`). Perfect for RPG servers!
* **🎫 Promo Codes:** Create single-use or multi-use codes that can be activated to receive currency, items, or roles. Perfect for partnership programs or stream rewards!
* **🤖 Promo Code Auto-Generator:** The bot can **automatically** generate unique promo codes at set intervals (e.g., every hour in a special channel), maintaining constant community interest.

---

## 🔗 **Unified Economic Network**

Most importantly — all these systems **interact seamlessly** with each other!

* **Achievement** can give a **promo code**.
* **Promo code** — add an **income role**.
* **Income role** — bring **currency**.
* **Currency** — be spent at **auctions** and **jobs**.
* **Job** — give an **item**.
* **Item** — be part of a **quest**.
* **Quest** — reward with a new **achievement**.

**Create your unique economic cycle that will keep and entertain members for months to come!**

---

🚀 **Ready to transform your server into something greater? [Invite Global Bot](https://wetbot.space) and start creating!**

*Setup, magic, economy — all in your hands.* ✨

## 🛠 Technology Stack

- **🌐 Backend:** [Node.js](https://nodejs.org/) (v22.12.0+)
- **💾 Database:** [MongoDB](https://mongodb.com)
- **📦 Package Manager:** npm
- **🐍 Discord API:** [Discord.js](https://discord.js.org)

## 🚀 Quick Start

### 📋 Prerequisites

Before installation, make sure you have installed:

- [Node.js](https://nodejs.org/) version 22.12.0 or higher
- [npm](https://npmjs.com/) (usually comes with Node.js)
- [MongoDB](https://mongodb.com) (local or cloud version)
- [Discord Application](https://discord.com/developers/applications) with a bot

### ⚡ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arhip144/wetbot-public.git
   cd wetbot-public
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory and add:
   ```env
   discordToken=your_discord_bot_token_here
   mongoDB_SRV=your_mongodb_connection_string_here
   errorWebhook=your_discord_webhook_url_for_errors
   ```

4. **Open the configuration file**

   Navigate to the `config` folder and open the `botconfig.js` file with any text editor.

5. **Set your Discord ID**

   Find the `ownerId` field and replace the value with your Discord account ID:
   ```javascript
   module.exports = {
     discord: {
        ownerId: "123456789012345678", // ← Replace with your Discord ID
     }
     // ... other settings
   }
   ```

6. **Start the bot**
   ```bash
   npm start
   ```

## 📖 Usage

### 🎯 Basic Commands

```bash
# Start the bot in production mode
npm start
```

### 🎯 Registering Slash Commands

    In any channel, type !reg - the bot will register the /reg slash command.

    After that, you can use the /reg slash command to register all other commands.

    Owner commands are registered separately using /reg:
    /reg command_name: editor guild_id: your_home_server_ID
    /reg command_name: eval guild_id: your_home_server_ID
    /reg command_name: unreg guild_id: your_home_server_ID
    /reg command_name: reload-cache guild_id: your_home_server_ID

### 🗃️ Documentation

    https://docs.wetbot.space/

## ⚙️ Configuration

### 🔑 Environment Variables (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `discordToken` | Your Discord bot token | ✅ |
| `mongoDB_SRV` | Connection string for MongoDB | ✅ |
| `errorWebhook` | Webhook URL for sending errors | ✅ |

### 🗄 Database Setup

The bot will automatically create the necessary collections in MongoDB on first startup. Make sure your connection string includes read and write permissions.

## 🛠 Development

### 📁 Project Structure

```
wetbot-public/
├── slash-commands/    # Bot commands folder
├── interactions/      # Additional button handlers
├── classes/           # Classes
├── events/            # Discord event handlers
├── schemas/           # MongoDB models
├── modules/           # Independent modules
├── config/            # Configuration files
└── package.json       # Dependencies and scripts
```

### 🔧 Adding New Commands

1. Create a file in the `slash-commands/` folder
2. Export a command object:
   ```javascript
   module.exports = {
     name: 'command_name',
     description: 'Command description',
     dmPermission: false, // Run command in bot's DMs
     group: `general`, // Command group in /help
     cooldowns: new Collection(),
     run: async (client, interaction) => {
       // Command logic
     }
   }
   ```

## 🤝 Contributing

We welcome contributions to Global Bot development!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is distributed under the GPL v3 license. See the [LICENSE](LICENSE) file for details.

## 📞 Support

- 🐛 **Report a bug:** https://discord.gg/kaK6JEuRht
- 💡 **Suggest a feature:** https://discord.gg/kaK6JEuRht
- 📧 **Contact:** [GitHub Profile](https://github.com/aliyyan007)

## ⭐ Acknowledgments

Thanks to everyone who contributes to the project! Special thanks to:

- Tipheret for translating the bot to Spanish
- MongoDB for the reliable database
- All testers and bot users

---

<div align="center">

### 💙 If you like the project, don't forget to give it a star! ⭐

</div>
