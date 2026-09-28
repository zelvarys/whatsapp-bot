const config = require('../config');
const video = require('../services/media/videoDownloaders');
const musicDownloader = require('../services/media/musicDownloader');
const state = require('../utils/stateHelpers');

const BUSY_MESSAGE = '⏳ Your previous request is still running. Please wait for it to finish.';

// -------------------- download --------------------

async function download(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `❌ Please provide a URL!\n*Usage:* ${config.prefix}download [url]`
    }, { quoted: msg });
  }

  const url = fullText.trim();

  if (state.isDownloadLocked(userJid, 'download', url)) {
    return sock.sendMessage(sender, { text: BUSY_MESSAGE }, { quoted: msg });
  }

  state.lockDownload(userJid, 'download', url);

  try {
    const result = await video.universal(url);

    if (!result.success) {
      throw new Error(result.error || 'Download failed');
    }

    const caption = `┌─⊶✧ *Downloaded Media*
│ ${result.title ? `*Title:* ${result.title.slice(0, 40)}` : ''}${result.author ? `\n│ *Author:* ${result.author}` : ''}
└─────────────⊶`;

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
  } finally {
    state.unlockDownload(userJid, 'download', url);
  }
}

async function youtube(sock, msg, sender, userJid, fullText) {
  return download(sock, msg, sender, userJid, fullText);
}

async function tiktok(sock, msg, sender, userJid, fullText) {
  return download(sock, msg, sender, userJid, fullText);
}

async function facebook(sock, msg, sender, userJid, fullText) {
  return download(sock, msg, sender, userJid, fullText);
}

// -------------------- song --------------------

async function song(sock, msg, sender, userJid, fullText) {
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

  if (state.isDownloadLocked(userJid, 'song', query)) {
    return sock.sendMessage(sender, { text: BUSY_MESSAGE }, { quoted: msg });
  }

  state.lockDownload(userJid, 'song', query);

  try {
    const result = await musicDownloader.downloadMusic(query);

    if (!result.success) throw new Error(result.error || 'Download failed');

    await sock.sendMessage(sender, {
      audio: result.buffer,
      mimetype: 'audio/mpeg',
      fileName: `${result.title.replace(/[^\w\s]/gi, '')}.mp3`
    }, { quoted: msg });
  } catch (err) {
    console.error('Song command error:', err.message);

    let errorMsg = '❌ Could not download music.';
    if (err.message.includes('not found')) errorMsg = '❌ Song not found. Try different keywords.';
    else if (err.message.includes('timeout')) errorMsg = '❌ Download timed out. Try shorter song.';

    await sock.sendMessage(sender, { text: errorMsg }, { quoted: msg });
  } finally {
    state.unlockDownload(userJid, 'song', query);
  }
}

module.exports = {
  download,
  youtube,
  tiktok,
  facebook,
  song
};