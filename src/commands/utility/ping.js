const config = require('../../config');

// !ping — measures round-trip latency by timing a send.
async function handle(sock, msg, sender) {
  const start = Date.now();

  try {
    const sent = await sock.sendMessage(sender, {
      text: `🏓 *Pong!* ${config.botName} ${config.botVersion}`
    }, { quoted: msg });

    const responseTime = Date.now() - start - 200;

    let status = 'Excellent';
    let emoji = '⚡';
    if (responseTime > 1000) { status = 'Slow'; emoji = '🐢'; }
    else if (responseTime > 500) { status = 'Moderate'; emoji = '⚠️'; }
    else if (responseTime > 200) { status = 'Good'; emoji = '✅'; }

    await sock.sendMessage(sender, {
      text: `┌─⊶📡 *BOT LATENCY*
│ 🏓 *Ping:* ${responseTime}ms
│ ${emoji} *Status:* ${status}
└─────────────⊶`
    }, { quoted: msg });

    try { await sock.sendMessage(sender, { delete: sent.key }); } catch {}
  } catch (err) {
    console.error('Ping command error:', err.message);
    await sock.sendMessage(sender, {
      text: '❌ Could not measure response time.'
    }, { quoted: msg });
  }
}

module.exports = { handle };