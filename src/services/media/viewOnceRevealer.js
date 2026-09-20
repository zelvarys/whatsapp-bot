// Reveals view-once media. The caller downloads the media;
// this service just re-sends it as a normal message.

async function revealAndSend(sock, chatJid, mediaBuffer, isVideo, quotedMsg) {
  if (isVideo) {
    return sock.sendMessage(chatJid, { video: mediaBuffer }, { quoted: quotedMsg });
  }
  return sock.sendMessage(chatJid, { image: mediaBuffer }, { quoted: quotedMsg });
}

module.exports = { revealAndSend };