const fs = require('fs');
const config = require('../../config');
const { BOT_IMAGE_PATH } = require('../../config/appConstants');

// !help | !menu | !commands — displays the command menu.
// Not quoted intentionally so it doesn't clutter chat.

function buildHelpText() {
  return `⨳
▸ *Mode:* ${global.botMode}
▸ *Prefix:* ${config.prefix}
▸ *Dev:* I̶n̶c̶o̶g̶n̶i̶t̶o̶シ︎ꨄ︎

╔═══════ ∘◦ ✧ ◦∘ ═══════╗

┌─⊶ *AI & CREATIVE*
│• ask [question]
│• story [prompt]
│• chatbot on/off
│• translate
│• tts [text]
│• summary [num]
└────────────⊶

┌─⊶ *GAMES & FUN*
│• games
│• game [type]
│• ttt start @friend
│• rps [choice]
└────────────⊶

┌─⊶ *UTILITY TOOLS*
│• compress
│• qrcode [text]
│• reveal
│• sticker
│• pdf [image/text]
│• delete
└────────────⊶

┌─⊶ *USER SYSTEM*
│• profile
│• leaderboard
│• register [name]
│• crypto [coin]
│• feedback
└────────────⊶

┌─⊶ *MEDIA DOWNLOAD*
│• download
│• song [name/url]
│• youtube
│• tiktok
│• instagram
└────────────⊶

┌─⊶ *OWNER ONLY*
│• broadcast
│• eval [script]
│• groups
│• mode [args]
└────────────⊶

┌─⊶ *OTHERS*
│• ping - Bot latency
│• stats - Bot statistics
│• !! - Repeat command
│• dev - Owner info
│• help - Show help menu
└────────────⊶

╘═══════════════════╛`;
}

async function handle(sock, sender) {
  const helpText = buildHelpText();

  try {
    if (fs.existsSync(BOT_IMAGE_PATH)) {
      const imageBuffer = fs.readFileSync(BOT_IMAGE_PATH);
      await sock.sendMessage(sender, {
        image: imageBuffer,
        mimetype: 'image/jpeg',
        caption: helpText,
        jpegThumbnail: null,
        viewOnce: false
      });
    } else {
      await sock.sendMessage(sender, { text: helpText });
    }
  } catch (err) {
    console.error('Help command error:', err.message);
    await sock.sendMessage(sender, { text: helpText });
  }
}

module.exports = { handle };