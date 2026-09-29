## Contributing

Thanks for considering a contribution. This guide covers how to submit changes.

### Before you start

- Open an issue first for anything beyond a small fix. This avoids work on a feature that might not be accepted.
- Search existing issues and pull requests before opening a new one.
- One feature or fix per pull request. Do not bundle unrelated changes.

### Setup

Fork the repository, then clone your fork:

```bash
git clone https://github.com/<your-username>/zelvarys-bot.git
cd zelvarys-bot
npm install
```

Copy `.env.example` to `.env` and fill in your own API keys and phone number. Do not reuse the maintainer's credentials.

### Code style

- Match the existing style. No decorative comment banners, no emoji in commit messages or code.
- Use single quotes for strings. Semicolons at statement ends.
- Two-space indentation.
- Function names describe what they do. `handleIncomingMessage` not `handle` if there is any ambiguity.
- Prefer small focused functions over large ones. If a function exceeds roughly 60 lines, consider splitting it.
- Comments explain why, not what. Skip comments that restate the code.

### Adding a command

Commands live in `src/commands/`. Pick the right category:

- `aiCommands.js` — AI, chatbot, mood
- `gameCommands/` — solo, versus, or lobby sub-folder
- `utilityCommands/` — one file per utility
- `mediaCommands.js` — downloaders
- `userCommands.js` — profile, leaderboard, crypto, feedback
- `ownerCommands.js` — owner-only
- `otherCommands.js` — help, ping, stats, owner info

For a new utility command, create `src/commands/utilityCommands/yourCommand.js` exporting a `handle(sock, msg, sender, userJid, args)` function. Then require it in `src/routing/commandRouter.js` and add a case to the dispatch switch.

For a new game, add it to `src/services/games/` with `startGame`, `handleTurn`, and `handleTimeout` exports, then register it in `src/commands/gameCommands/registry.js`.

If the command is user-facing, update:

- `src/commands/otherCommands.js` — help menu
- `src/config/commandAliases.js` — aliases
- `src/config/appConstants.js` — reaction emoji
- `src/utils/suggestionHelpers.js` — known commands list

### Adding game content

Content files are JSON in `content/`. Each file is loaded once at startup and cached.

- `trivia_questions.json` — `{ question, options, answer }`
- `word_scramble.json` — `{ word, scrambled, hint }`
- `riddles.json` — `{ question, answer }`
- `country_flags.json` — `{ country, flag }`
- `hangman_words.json` — `{ word, category }`

Load them with `require('./contentLoader').load('<filename-without-extension>')`.

### Testing

Test the command in a real WhatsApp chat before opening a pull request. Include:

- The command working as expected in a private chat
- The command working as expected in a group chat, if applicable
- The command handling invalid input gracefully
- The command handling missing arguments gracefully
- The command not breaking on network failures

If your change affects the media downloaders or the game engines, note the platform and Baileys version you tested on.

### Commit messages

Use a short subject line, under 72 characters, with an imperative mood.

```
feat(games): add word chain game
fix(media): handle expired tiktok urls
refactor(commands): move utility handlers into one file
chore(config): add alias for song command
docs: update install instructions
```

Prefixes:

- `feat` — a new feature
- `fix` — a bug fix
- `refactor` — restructuring without behavior change
- `chore` — config, dependencies, minor maintenance
- `docs` — documentation only

Add a body only when the subject is not enough. Separate the body from the subject with a blank line.

### Do not commit

- `.env`
- `data/`
- `auth_info/`
- `temp/`
- `node_modules/`
- Anything with API keys, phone numbers, or credentials

These are in `.gitignore`. If you add a new file type that should not be tracked, add it to `.gitignore` in the same commit.

### Pull request

- Give the PR a descriptive title.
- Describe what changed and why in the description.
- Reference the issue the PR closes, if there is one.
- Keep the diff focused. Do not include unrelated formatting changes.

### Reporting bugs

Open an issue with:

- The command that failed
- What you expected to happen
- What actually happened
- The terminal output, including any error messages
- Your Baileys version, from `npm ls @whiskeysockets/baileys`
- Whether the issue reproduces every time or intermittently

### License

By contributing, you agree that your contributions are licensed under the MIT License.