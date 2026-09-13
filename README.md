# 🎭 Incognito WhatsApp Bot
> Advanced multi-featured WhatsApp bot for Termux!

### Installation

*Update system packages*
- pkg update && pkg upgrade

*Install necessary packages*
- pkg install nodejs git
- pkg install wget curl
- pkg install python make
- pkg install termux-api
- pip install yt-dlp
- pkg install ffmpeg -y
- npm install -g pm2

*Copy directory from storage*
- termux-setup-storage
- cp -r ~/storage/shared/Incognito-bot/ .

*Install required dependencies*
- npm install
- npm install --legacy-peer-deps

*Start the bot*
- pm2 start ecosystem.config.js
- node index.js

*Daily usage commands*
- pm2 start index.js
- pm2 stop index.js
- pm2 restart index.js
- pm2 logs index.js
- pm2 delete Incognito-bot

### Authentication

The bot uses an **8-digit pairing code** for authentication (no QR code needed).

**Steps:**
1. Start the bot: `node index.js`
2. When prompted, enter your phone number (digits only, with country code, e.g., `2349065168872`)
3. Copy the pairing code shown
4. On WhatsApp: **Settings → Linked Devices → Link a Device → Link with phone number**
5. Enter the pairing code

### Project Structure

See full structure in README.

### Performance Tips

*Termux Optimization*
- Install required packages
- pkg install nodejs ffmpeg python -y
- pip install yt-dlp

*Memory Management*
- Bot auto-restarts if memory exceeds 300MB
- Old game sessions auto-clean after 20 seconds
- Cache files automatically cleaned daily

### Troubleshooting

*Common Issues*
1. Pairing code not showing: Ensure your phone number includes country code
2. API errors: Check your .env file has valid API keys
3. Media download fails: Install FFmpeg: pkg install ffmpeg
4. Bot not responding: Check console output
5. Memory issues: Use PM2 for better management

### 📄 License

MIT License

### 👤 Developer

Incognito (Osasan Olusola)
- WhatsApp: +234 906 516 8872
- Email: me.zelvarys@gmail.com
- GitHub: https://github.com/zelvarys