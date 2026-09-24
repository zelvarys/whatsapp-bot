const fs = require('fs');
const config = require('../../config');

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
│• mood [type]
└────────────⊶

┌─⊶ *GAMES & FUN*
│• games
│• game [type]
│• bombshell 
│• hotseat
│• ttt start @friend
│• rps [choice]
└────────────⊶

┌─⊶ *UTILITY TOOLS*
│• define [word]
│• compress
│• sticker
│• qrcode [text]
│• pdf [image/text]
│• reveal
│• weather [city]
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
│• facebook
└────────────⊶

┌─⊶ *OWNER ONLY*
│• broadcast
│• groups
│• mode [args]
│• restart
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
    if (fs.existsSync(config.botImagePath)) {
      const imageBuffer = fs.readFileSync(config.botImagePath);
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