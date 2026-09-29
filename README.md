## Zelvarys WhatsApp Bot

A feature-rich WhatsApp bot built on Baileys. Includes AI tools, a points and ranking system, media downloaders, single-player and multiplayer games, and a set of everyday utility commands.

### Features

**AI**
- Chat, story generation, translation, text-to-speech, chat summarization
- Group-scoped AI mood (roast or chill)
- Optional chatbot mode for automatic replies

**Games**
- Solo: hangman, trivia, riddle, flag quiz, number guessing, word scramble
- Head to head: tic-tac-toe with an AI opponent, rock-paper-scissors
- Lobby: bombshell and cluster, both need three or more players

**Utility**
- Dictionary lookup, weather
- Sticker, compression, view-once reveal, QR code
- Delete bot messages

**Media**
- YouTube video and audio, TikTok, Facebook downloads
- Duplicate-request protection so a user cannot fire the same download twice

**Users**
- Points, levels, tier rankings, and leaderboards
- Feedback forwarding to the owner

**Owner**
- Broadcast to all groups
- Bot mode toggle between public and private
- Group listing and restart

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
git clone <repo-url>
cd whatsapp-bot
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

### Environment

- `GEMINI_API_KEY_*` — Gemini API keys. The bot rotates through them on rate limits.
- `DAILY_AI_LIMIT` — Requests per user per day. Applies to `!ask` and `!story`.

### Notes

- Game content lives in `content/`. Add words, questions, or flags by editing the JSON.
- The `data/` directory is created at runtime. Do not commit it.
- `auth_info/` holds the WhatsApp session. Delete it to re-pair.

### License

MIT