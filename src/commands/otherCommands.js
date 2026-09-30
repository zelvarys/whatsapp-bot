const fs = require('fs');
const os = require('os');
const config = require('../config');
const { formatUptime } = require('../utils/formatHelpers');

// -------------------- help --------------------

function buildHelpText() {
  return `⨳
▸ *Mode:* ${global.botMode}
▸ *Prefix:* ${config.prefix}
▸ *Dev:* I̶n̶c̶o̶g̶n̶i̶t̶o̶シ︎ꨄ︎

╔═══════ ∘◦ ✧ ◦∘ ═══════╗

┌─⊶ *1. AI & CREATIVE*
│• ask <question>
│• chatbot on/off
│• summary <num>
│• translate
│• story <prompt>
│• tts <text>
│• mood chill/roast
└────────────⊶

┌─⊶ *2. GAMES & FUN*
│• game <type>
│• games
│• bombshell 
│• hotseat
│• ttt start @friend
└────────────⊶

┌─⊶ *3. UTILITY TOOLS*
│• define <word>
│• compress
│• sticker
│• pdf image/text
│• qrcode <text>
│• reveal
│• weather <city>
└────────────⊶

┌─⊶ *4. USER SYSTEM*
│• profile
│• leaderboard
│• register <name>
│• crypto <coin>
│• feedback
└────────────⊶

┌─⊶ *5. MEDIA DOWNLOAD*
│• download
│• song <name/url>
│• youtube
│• tiktok
│• facebook
└────────────⊶

┌─⊶ *6. OWNER ONLY*
│• broadcast
│• groups
│• mode <args>
│• restart
└────────────⊶

┌─⊶ *7. OTHERS*
│• ping - Bot latency
│• stats - Bot statistics
│• !! - Repeat command
│• dev - Owner info
│• help - Show help menu
└────────────⊶

╘═══════════════════╛`;
}

async function help(sock, sender) {
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

// -------------------- ping --------------------

async function ping(sock, msg, sender) {
  const start = Date.now();

  try {
    const sent = await sock.sendMessage(sender, {
      text: `🏓 *Pong!* ${config.botName} ${config.botVersion}`
    }, { quoted: msg });

    const responseTime = Date.now() - start;

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

// -------------------- stats --------------------

function collectSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    type: os.type(),
    nodeVersion: process.version,
    v8Version: process.versions.v8,
    processUptimeSeconds: Math.floor(process.uptime())
  };
}

async function stats(sock, sender) {
  const bot = global.botInstance;

  if (!bot) {
    return sock.sendMessage(sender, {
      text: '📊 Bot statistics temporarily unavailable.'
    });
  }

  const s = bot.stats;
  const uptimeMs = Date.now() - s.startTime;
  const sys = collectSystemInfo();

  const text = `*✧ BOT STATISTICS*
╒═══════════════════╕

▸ *Name:* ${config.botName}
▸ *Version:* ${config.botVersion}
▸ *Prefix:* ${config.prefix}
▸ *Mode:* ${global.botMode}

┌─⊶ *SYSTEM*
│ *Platform:* ${sys.platform} ${sys.arch}
│ *OS:* ${sys.type}
│ *Node.js:* ${sys.nodeVersion}
│ *V8 Engine:* ${sys.v8Version}
│ *Environment:* Termux
│ *Process Uptime:* ${sys.processUptimeSeconds}s
└─────────────⊶

┌─⊶ *ACTIVITY*
│ *Messages:* ${s.messagesReceived}
│ *Commands Executed:* ${s.commandsExecuted}
│ *Games Played:* ${s.gamesPlayed}
│ *Groups Joined:* ${Object.keys(global.groupData).length}
│ *Uptime:* ${formatUptime(uptimeMs)}
└─────────────⊶

┌─⊶ *STATUS*
│ *Status:* ${bot.isConnected ? 'Connected ✅' : 'Disconnected ❌'}
│ *Online Since:* ${bot.onlineSince ? new Date(bot.onlineSince).toLocaleTimeString() : 'Offline'}
└─────────────⊶

╘═══════════════════╛`;

  await sock.sendMessage(sender, { text });
}

// -------------------- owner info --------------------

async function ownerInfo(sock, msg, sender) {
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

module.exports = {
  help,
  ping,
  stats,
  ownerInfo
};