## Zelvarys WhatsApp Bot

A feature-rich WhatsApp bot built on Baileys. Includes AI tools, a points and ranking system, media downloaders, single-player and multiplayer games, and a set of everyday utility commands.

### Features

- **AI:** chat, story generation, translation, text-to-speech, chat summarization, group-scoped AI mood (roast or chill), and optional chatbot mode for automatic replies.
- **Games:** hangman, trivia, riddle, flag quiz, number guessing, word scramble, tic-tac-toe with an AI opponent, rock-paper-scissors, and two lobby games — bombshell and cluster — that need three or more players.
- **Utility:** dictionary lookup, weather, sticker creation, media compression, view-once reveal, QR code generation, and bot message deletion.
- **Media:** YouTube video and audio downloads, TikTok, Facebook, with duplicate-request protection so the same user cannot fire the same download twice.
- **Users:** points, levels, tier rankings, leaderboards, and feedback forwarding to the owner.
- **Owner:** group broadcast, bot mode toggle between public and private, group listing, and soft restart.

### Requirements

- Node.js 16 or newer
- FFmpeg
- Python and yt-dlp
- Deno for yt-dlp's YouTube support

On Debian-based systems:

```bash
pkg update && pkg upgrade
pkg install nodejs git ffmpeg python deno
pip install -U "yt-dlp[default]"
```

### Install

```bash
git clone https://github.com/zelvarys/zelvarys-bot.git
cd zelvarys-bot
npm install
```

### Configuration

Copy `.env.example` to `.env` and fill in the following:

- `OWNER_NUMBER` — owner phone number, digits only with country code
- `OWNER_LID` — owner WhatsApp LID, used for owner checks
- `BOT_NAME` — bot display name
- `BOT_PREFIX` — command prefix
- `GEMINI_API_KEY_1` through `_5` — at least one is required
- `DAILY_AI_LIMIT` — max AI requests per user per day

The bot rotates through the Gemini keys on rate limits or errors, so adding more than one makes it more resilient. `OWNER_LID` is only needed if your WhatsApp account delivers messages as LIDs instead of phone numbers; you can leave it empty until you confirm which format your account uses.

### Run

```bash
node index.js
```

On first start, the bot prompts for a phone number and prints an 8-digit pairing code. Enter it on WhatsApp under **Linked Devices → Link with phone number**.

### Run with PM2

```bash
npm install -g pm2
pm2 start index.js --name zelvarys-bot
pm2 save
pm2 logs zelvarys-bot
```

### Project structure

```
src/
├── core/           Bot class, socket, event handling
├── routing/        Message, command, game, lobby, chatbot routers
├── commands/       Command handlers grouped by category
├── services/       AI, media, game engines, external APIs
├── models/         JSON persistence
├── utils/          Shared helpers
└── config/         Environment, constants, aliases

content/            Static game content in JSON
data/               Runtime state, gitignored
assets/             Bot image
auth_info/          Baileys credentials, gitignored
temp/               Transient files, gitignored
```

### Commands

Type `!help` in any chat to see the full menu. Categories:

- **AI** — `ask`, `story`, `chatbot`, `translate`, `tts`, `summary`, `mood`
- **Games** — `games`, `game`, `ttt`, `rps`, `bombshell`, `cluster`
- **Utility** — `define`, `weather`, `sticker`, `compress`, `qrcode`, `reveal`, `delete`
- **Users** — `profile`, `leaderboard`, `register`, `crypto`, `feedback`
- **Media** — `download`, `song`, `youtube`, `tiktok`, `facebook`
- **Owner** — `broadcast`, `groups`, `mode`, `restart`

Prefix defaults to `!` and can be changed in `.env`.

### Environment

- `GEMINI_API_KEY_*` — Gemini API keys. The bot rotates through them on rate limits.
- `DAILY_AI_LIMIT` — Requests per user per day. Applies to `ask` and `story`.

### Data and persistence

Runtime state lives in `data/` and is gitignored. The directory is created on first start.

- `user_profiles.json` — points, levels, achievements, usernames
- `game_statistics.json` — per-game play counts and total points
- `bot_settings.json` — bot mode, chatbot state, group AI moods
- `command_cache.json` — cached command responses

Content that ships with the bot lives in `content/` and is committed:

- `trivia_questions.json`
- `word_scramble.json`
- `riddles.json`
- `country_flags.json`
- `hangman_words.json`

### Notes

- Game content lives in `content/`. Add words, questions, or flags by editing the JSON.
- The `data/` directory is created at runtime. Do not commit it.
- `auth_info/` holds the WhatsApp session. Delete it to re-pair.
- Bot version is set in `src/config/appConstants.js`.

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### License

MIT. See [LICENSE](LICENSE) for details.