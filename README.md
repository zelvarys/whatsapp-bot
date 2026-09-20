whatsapp-bot/
├── assets/
│   └── bot_image.jpg
│
├── content/
│   ├── country_flags.json
│   ├── riddles.json
│   ├── trivia.json
│   └── word_scramble.json
│
├── data/
│   └── .gitkeep
│
├── src/
│   ├── commands/
│   │   ├── ai/
│   │   │   ├── ask.js
│   │   │   ├── chatbot.js
│   │   │   ├── story.js
│   │   │   ├── summary.js
│   │   │   ├── translate.js
│   │   │   └── tts.js
│   │   ├── games/
│   │   │   ├── flag.js
│   │   │   ├── guess.js
│   │   │   ├── registry.js
│   │   │   ├── riddle.js
│   │   │   ├── rps.js
│   │   │   ├── scramble.js
│   │   │   ├── tictactoe.js
│   │   │   └── trivia.js
│   │   ├── media/
│   │   │   ├── download.js
│   │   │   ├── instagram.js
│   │   │   ├── song.js
│   │   │   ├── tiktok.js
│   │   │   └── youtube.js
│   │   ├── owner/
│   │   │   ├── broadcast.js
│   │   │   ├── eval.js
│   │   │   ├── groups.js
│   │   │   └── mode.js
│   │   ├── user/
│   │   │   ├── crypto.js
│   │   │   ├── feedback.js
│   │   │   ├── leaderboard.js
│   │   │   ├── profile.js
│   │   │   └── register.js
│   │   └── utility/
│   │       ├── compress.js
│   │       ├── delete.js
│   │       ├── help.js
│   │       ├── owner-info.js
│   │       ├── pdf.js
│   │       ├── ping.js
│   │       ├── qrcode.js
│   │       ├── reveal.js
│   │       ├── stats.js
│   │       └── sticker.js
│   │
│   ├── config/
│   │   ├── appConstants.js
│   │   ├── commandAliases.js
│   │   ├── environment.js
│   │   └── index.js
│   │
│   ├── core/
│   │   ├── globalState.js
│   │   ├── socketConnection.js
│   │   ├── socketEvents.js
│   │   └── whatsappBot.js
│   │
│   ├── models/
│   │   ├── botStateModel.js
│   │   ├── commandCacheModel.js
│   │   ├── gameStatsModel.js
│   │   ├── index.js
│   │   ├── jsonRepository.js
│   │   └── userModel.js
│   │
│   ├── routing/
│   │   ├── chatbotRouter.js
│   │   ├── commandRouter.js
│   │   ├── gameRouter.js
│   │   └── messageRouter.js
│   │
│   ├── services/
│   │   ├── ai/
│   │   │   ├── chatbotConversation.js
│   │   │   ├── geminiClient.js
│   │   │   ├── storyGenerator.js
│   │   │   └── translationEngine.js
│   │   ├── external/
│   │   │   ├── coinGeckoClient.js
│   │   │   └── qrCodeGenerator.js
│   │   ├── media/
│   │   │   ├── instagramDownloader.js
│   │   │   ├── mediaCompressor.js
│   │   │   ├── musicDownloader.js
│   │   │   ├── pdfConverter.js
│   │   │   ├── stickerProcessor.js
│   │   │   ├── textToSpeechEngine.js
│   │   │   ├── tiktokDownloader.js
│   │   │   ├── universalDownloader.js
│   │   │   ├── viewOnceRevealer.js
│   │   │   └── youtubeDownloader.js
│   │   └── index.js
│   │
│   ├── system/
│   │   ├── periodicCleanup.js
│   │   └── systemStats.js
│   │
│   └── utils/
│       ├── byteFormatter.js
│       ├── commandSuggester.js
│       ├── consoleLogger.js
│       ├── contentLoader.js
│       ├── gameRules.js
│       ├── index.js
│       ├── jidHelpers.js
│       ├── lastCommandTracker.js
│       ├── mentionDetector.js
│       ├── mentionStripper.js
│       ├── messageReactions.js
│       ├── messageTracker.js
│       ├── ownerChecker.js
│       ├── uptimeFormatter.js
│       └── userCooldowns.js
│
├── .env
├── .env.example
├── .gitignore
├── index.js
├── package.json
└── README.md