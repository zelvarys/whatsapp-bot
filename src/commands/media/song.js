const config = require('../../config');
const musicDownloader = require('../../services/media/musicDownloader');

// !song <name or url> — downloads an audio track.
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *MUSIC DOWNLOAD*
┌─⊶
│ *Usage:* ${config.prefix}song [name/url]
│ *Example:* ${config.prefix}song say goodbye
└─────────────⊶`
    }, { quoted: msg });
  }

  const query = fullText.trim();

  try {
    const result = query.includes('http')
      ? await musicDownloader.downloadMusic(query)
      : await musicDownloader.searchAndDownload(query);

    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }

    await sock.sendMessage(sender, {
      audio: result.buffer,
      mimetype: 'audio/mpeg',
      fileName: `${result.title.replace(/[^\w\s]/gi, '')}.mp3`,
      caption: `🎵 ${result.title}\n✅ Downloaded`
    }, { quoted: msg });
  } catch (err) {
    console.error('Song command error:', err.message);

    let errorMsg = '❌ Could not download music.';
    if (err.message.includes('not found')) errorMsg = '❌ Song not found. Try different keywords.';
    else if (err.message.includes('timeout')) errorMsg = '❌ Download timed out. Try shorter song.';

    await sock.sendMessage(sender, { text: errorMsg }, { quoted: msg });
  }
}

module.exports = { handle };