const config = require('../../config');
const universalDownloader = require('../../services/media/universalDownloader');

// !download <url> — auto-detects platform and downloads.
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `❌ Please provide a URL!\n*Usage:* ${config.prefix}download [url]`
    }, { quoted: msg });
  }

  const url = fullText.trim();

  try {
    const result = await universalDownloader.download(url);

    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }

    const caption = `┌─⊶✧ *Downloaded Media*
│ ${result.title ? `*Title:* ${result.title.slice(0, 25)}...` : ''}
└─────────────⊶
▸ _Downloaded via ${config.botName}_`;

    await sock.sendMessage(sender, {
      video: result.buffer,
      caption,
      mimetype: 'video/mp4'
    }, { quoted: msg });
  } catch (err) {
    console.error('Download command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Download failed! Try a different link or platform.'
    }, { quoted: msg });
  }
}

module.exports = { handle };