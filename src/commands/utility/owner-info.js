const config = require('../../config');

// !owner | !dev | !info — displays developer contact info.
async function handle(sock, msg, sender) {
  const text = `✧ *DEVELOPER INFO*
╒═══════════════════╕

┌─⊶ *ABOUT*
│ *Name:* Osasan Olusola
│ *Nickname:* Incognito
│ *Phone:* +2349065168872
│ *Country:* Nigeria
└─────────────⊶

┌─⊶ *CAREER*
│• Backend Developer
│• Machine Learning Enthusiast
│• Bot Developer
│• Automation Expert
└─────────────⊶

┌─⊶ *SKILLS*
│• JavaScript/Node.js
│• Python
│• Machine Learning
│• API Development
│• Database Management
└─────────────⊶

┌─⊶ *CONTACT*
│ *WhatsApp:* +2349065168872
│ *Email:* me.zelvarys@gmail.com
│ *Github:* github.com/zelvarys
└─────────────⊶

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text }, { quoted: msg });
}

module.exports = { handle };