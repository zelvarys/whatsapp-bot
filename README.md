## Zelvarys WhatsApp Bot

A feature-rich WhatsApp bot built on Baileys. Includes AI tools, a points and ranking system, media downloaders, single-player and multiplayer games, and a set of everyday utility commands.

### Features

AI: chat, story generation, translation, text-to-speech, chat summarization, group-scoped AI mood (roast or chill), and optional chatbot mode for automatic replies.

Games: hangman, trivia, riddle, flag quiz, number guessing, word scramble, tic-tac-toe with an AI opponent, rock-paper-scissors, and two lobby games — bombshell and cluster — that need three or more players.

Utility: dictionary lookup, weather, sticker creation, media compression, view-once reveal, QR code generation, and bot message deletion.

Media: YouTube video and audio downloads, TikTok, Facebook, with duplicate-request protection so the same user cannot fire the same download twice.

Users: points, levels, tier rankings, leaderboards, and feedback forwarding to the owner.

Owner: group broadcast, bot mode toggle between public and private, group listing, and soft restart.

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

### Adding a command

Commands live in `src/commands/`. Pick the category the command belongs to:

- `aiCommands.js` — AI, chatbot, mood
- `gameCommands/` — solo, versus, or lobby sub-folder
- `utilityCommands/` — one file per utility
- `mediaCommands.js` — downloaders
- `userCommands.js` — profile, leaderboard, crypto, feedback
- `ownerCommands.js` — owner-only
- `otherCommands.js` — help, ping, stats, owner info

For a new utility command, create `src/commands/utilityCommands/yourCommand.js` exporting a `handle(sock, msg, sender, userJid, args)` function. Then require it in `src/routing/commandRouter.js` and add a case to the dispatch switch.

For a new game, add it to `src/services/games/` with `startGame`, `handleTurn`, and `handleTimeout` exports, then register it in `src/commands/gameCommands/registry.js`.

Command aliases go in `src/config/commandAliases.js`. Reactions in `src/config/appConstants.js`. Suggestions in `src/utils/suggestionHelpers.js`.

### Adding game content

Content files are JSON in `content/`. Each file is loaded once at startup and cached.

- `trivia_questions.json` — `{ question, options, answer }`
- `word_scramble.json` — `{ word, scrambled, hint }`
- `riddles.json` — `{ question, answer }`
- `country_flags.json` — `{ country, flag }`
- `hangman_words.json` — `{ word, category }`

Load them with `require('./contentLoader').load('<filename-without-extension>')`.

### Contributing

Fork the repository, create a branch, and open a pull request.

Guidelines:

- One feature or fix per pull request. Do not bundle unrelated changes.
- Match the existing code style. No decorative comment banners, no emoji in commit messages.
- Keep commands self-contained. If you need shared logic, put it in `utils/` rather than duplicating.
- Test the command in a real WhatsApp chat before opening the pull request.
- Do not commit `.env`, `data/`, `auth_info/`, `temp/`, or `node_modules/`.
- If the change affects the help menu, update `src/commands/otherCommands.js` and `src/utils/suggestionHelpers.js` in the same commit.


### Notes

- Game content lives in `content/`. Add words, questions, or flags by editing the JSON.
- The `data/` directory is created at runtime. Do not commit it.
- `auth_info/` holds the WhatsApp session. Delete it to re-pair.
