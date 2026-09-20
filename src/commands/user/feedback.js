const config = require('../../config');
const jidHelpers = require('../../utils/jidHelpers');
const userModel = require('../../models/userModel');

// !feedback <message>
// Forwards the feedback to the owner's DM.
async function handle(sock, msg, sender, userJid, fullText) {
  if (!fullText) {
    return sock.sendMessage(sender, {
      text: `✧ *FEEDBACK SYSTEM*
┌─⊶
│ *Usage:* ${config.prefix}feedback [message]
│ Send suggestions or bug reports
└─────────────⊶`
    }, { quoted: msg });
  }

  if (fullText.trim().length < 5) {
    return sock.sendMessage(sender, {
      text: '❌ Feedback must be at least 5 characters long!'
    }, { quoted: msg });
  }

  let feedbackText = fullText;
  if (feedbackText.length > 500) feedbackText = feedbackText.substring(0, 500) + '...';

  const userName = userModel.getDisplayName(userJid);

  if (config.ownerNumber) {
    const ownerJid = jidHelpers.phoneToUserJid(config.ownerNumber);

    const payload = `✧ *NEW FEEDBACK RECEIVED*

┌─⊶ *USER INFO*
│ *Name:* ${userName}
│ *User ID:* ${userJid}
│ *Chat Type:* ${jidHelpers.isGroupJid(sender) ? 'Group' : 'Private'}
│ *Time:* ${new Date().toLocaleString()}
└─────────────⊶

✧ *MESSAGE*
${feedbackText}`;

    await sock.sendMessage(ownerJid, { text: payload });
  }

  await sock.sendMessage(sender, {
    text: "Thank you for your feedback! It has been delivered to the developer team. 💖"
  }, { quoted: msg });
}

module.exports = { handle };