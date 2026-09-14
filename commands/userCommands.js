const config = require('../config');
const DataManager = require('../utils/dataManager');
const axios = require('axios');

class UserCommands {
  constructor(sock) {
    this.sock = sock;
  }
  
  async profile(sender, userJid, msg) {
    const user = DataManager.getUserData(userJid);
    const rank = DataManager.getUserRank(userJid);
    const levelProgress = (user.xp % 100);
    
    let rankTitle = "Newbie";
    if (user.level >= 50) rankTitle = "Legend";
    else if (user.level >= 30) rankTitle = "Master";
    else if (user.level >= 20) rankTitle = "Expert";
    else if (user.level >= 10) rankTitle = "Advanced";
    else if (user.level >= 5) rankTitle = "Veteran";
    
    const nextLevelXP = 100 - (user.xp % 100);
    
    let progressBar = '';
    const bars = 16;
    const filledBars = Math.floor((levelProgress / 100) * bars);
    for (let i = 0; i < bars; i++) {
      progressBar += i < filledBars ? '█' : '░';
    }
    
    const profileText = `✧ *USER PROFILE* v${config.version}
╒═══════════════════╕

┌─⊶ *BASIC INFO*
│ *Name:* ${user.username}
│ *Tier:* ${rankTitle}
│ *Global Rank:* #${rank}
│ *Level:* ${user.level} (${levelProgress}% to next)
│
│ ${progressBar}
└─────────────⊶

┌─⊶ *STATISTICS*
│ *Games Played:* ${user.gamesPlayed}
│ *Games Won:* ${user.gamesWon}
│ *Win Rate:* ${user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0}%
└─────────────⊶

┌─⊶ *PROGRESS*
│ *XP:* ${user.xp}
│ *Next Level:* ${nextLevelXP} XP needed
│ *Joined:* ${new Date(user.joinDate).toLocaleDateString()}
└─────────────⊶
${user.achievements.length > 0 ? `\n  *Achievements:*\n${user.achievements.map(ach => `• ${ach}`).join('\n')}` : '   *No achievements yet*'}

╘═══════════════════╛
▸ *Play more games to level up!*`;
    
    await this.sock.sendMessage(sender, {
      text: profileText
    }, { quoted: msg });
  }
  
  async ranks(sender, userJid, msg) {
    const ranksText = `✧ *RANKING SYSTEM* v${config.version}
╒═══════════════════╕

┌─⊶ *TIER SYSTEM*
│ *Newbie:* Level 1-4
│ *Veteran:* Level 5-9
│ *Advanced:* Level 10-19
│ *Expert:* Level 20-29
│ *Master:* Level 30-49
│ *Legend:* Level 50+
└─────────────⊶

┌─⊶ *LEVELING UP*
│ *XP per game:* 10-50 points
│ *Level requirement:* 100 XP
│ Earn XP by Playing games
└─────────────⊶

┌─⊶ *BENEFITS*
│ • Higher global ranking
│ • Exclusive achievements
│ • Bragging rights!
└─────────────⊶

╘═══════════════════╛
▸ *Check your rank with* ${config.prefix}profile`;
    
    await this.sock.sendMessage(sender, {
      text: ranksText
    }, { quoted: msg });
  }
  
  async leaderboard(sender, msg, args) {
    let limit = args[0] ? parseInt(args[0]) : 10;
    if (limit > 100) limit = 100;
    
    const users = DataManager.getLeaderboard(limit);
    
    let leaderboardText = `✧ *LEADERBOARD* v${config.version}
╒═════════════════════╕

`;
    
    users.forEach((user, index) => {
      let medal = '';
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';
      else medal = `${index + 1}.`;
      
      leaderboardText += `${medal} *${user.username}*
   Level ${user.level} • ${user.points} points • ${user.gamesWon} wins
─────────────────\n`;
    });
    
    leaderboardText += `\n╘═════════════════════╛
▸ *Total Players:* ${Object.keys(global.userData).length}`;
    
    await this.sock.sendMessage(sender, {
      text: leaderboardText
    }, { quoted: msg });
  }
  
  async register(sender, userJid, msg, args) {
    if (args.length === 0) {
      await this.sock.sendMessage(sender, {
        text: `❌ Please provide a username!\n*Usage:* ${config.prefix}register [username]`
      }, { quoted: msg });
      return;
    }
    
    const username = args[0];
    
    if (username.length < 3 || username.length > 20) {
      await this.sock.sendMessage(sender, {
        text: '❌ Username must be 3-20 characters long!'
      }, { quoted: msg });
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      await this.sock.sendMessage(sender, {
        text: '❌ Username can only contain letters, numbers, and underscores!'
      }, { quoted: msg });
      return;
    }
    
    const isTaken = Object.values(global.userData).some(user => 
      user.username && user.username.toLowerCase() === username.toLowerCase()
    );
    
    if (isTaken) {
      await this.sock.sendMessage(sender, {
        text: '❌ Username is already taken!'
      }, { quoted: msg });
      return;
    }
    
    const user = DataManager.getUserData(userJid);
    user.username = username;
    
    DataManager.saveUserData();
    
    await this.sock.sendMessage(sender, {
      text: `✅ *Registered Successfully!*\n• *New Username:* ${username}`
    }, { quoted: msg });
  }
  
  async donate(sender, msg) {
    const donateText = `✧ *SUPPORT THE DEVELOPER*
╒═══════════════════╕

▸ If you enjoy using this bot, consider donating!

┌─⊶ *DETAILS*
│ *Account:* 9065168872 (Moniepoint)
│ *Reference:* your_username
└─────────────⊶

┌─⊶ *IMPACT*
│ • Keep the bot running 24/7
│ • Add new features
│ • Improve server performance
│ • Support development work
└─────────────⊶

┌─⊶ *CONTACT*
│ *Contact:* +234 906 516 8872
│ *Email:* me.zelvarys@gmail.com
└─────────────⊶

╘═══════════════════╛
▸ *Thank you for your support!*`;
    
    await this.sock.sendMessage(sender, {
      text: donateText
    }, { quoted: msg });
  }
  
  async cryptoPrice(sender, userJid, msg, args) {
    if (args.length === 0) {
      const cryptoList = config.SUPPORTED_CRYPTOS.join(', ');
      await this.sock.sendMessage(sender, {
        text: `✧ *CRYPTO PRICES*\n\n*Usage:* ${config.prefix}crypto [coin]\n*Supported coins:* ${cryptoList}`
      }, { quoted: msg });
      return;
    }
    
    const coin = args[0].toLowerCase();
    
    if (!config.SUPPORTED_CRYPTOS.includes(coin)) {
      const cryptoList = config.SUPPORTED_CRYPTOS.join(', ');
      await this.sock.sendMessage(sender, {
        text: `❌ Unsupported cryptocurrency!\n*Supported coins:* ${cryptoList}\n\n*Use:* ${config.prefix}crypto bitcoin`
      }, { quoted: msg });
      return;
    }
    
    try {
      const processingMsg = await this.sock.sendMessage(sender, {
        text: `🔄 *Fetching ${coin} price...*`
      });
      
      const cacheKey = `crypto_${coin}`;
      const now = Date.now();
      
      if (!global.cryptoCache) global.cryptoCache = new Map();
      
      if (global.cryptoCache.has(cacheKey)) {
        const cached = global.cryptoCache.get(cacheKey);
        if (now - cached.timestamp < 300000) {
          await this.sock.sendMessage(sender, {
            text: cached.data
          });
          
          try {
            if (processingMsg && processingMsg.key) {
              await this.sock.sendMessage(sender, { delete: processingMsg.key });
            }
          } catch (e) {}
          
          return;
        }
      }
      
      const response = await axios.get(`${config.CRYPTO_API_URL}?ids=${coin}&vs_currencies=usd,ngn&include_24hr_change=true`, {
        timeout: 10000
      });
      
      if (response.data && response.data[coin]) {
        const data = response.data[coin];
        const priceUSD = data.usd.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const priceNGN = data.ngn.toLocaleString('en-US', { style: 'currency', currency: 'NGN' });
        const change24h = data.usd_24h_change ? data.usd_24h_change.toFixed(2) : '0.00';
        const changeEmoji = parseFloat(change24h) >= 0 ? '📈' : '📉';
        
        const cryptoText = `✧ *${coin.toUpperCase()} PRICE*
╒═══════════════════╕

┌─⊶ *PRICES*
│ 💵 *USD:* ${priceUSD}
│ 🇳🇬 *NGN:* ${priceNGN}
│ ${changeEmoji} *24h Change:* ${change24h}%
└─────────────⊶

┌─⊶ *MARKET INFO*
│ 🏦 *Rank:* #${data.market_cap_rank || 'N/A'}
│ ⏰ *Updated:* ${new Date().toLocaleTimeString()}
└─────────────⊶

╘═══════════════════╛
▸ _Data from CoinGecko API_`;
        
        global.cryptoCache.set(cacheKey, {
          data: cryptoText,
          timestamp: now
        });
        
        await this.sock.sendMessage(sender, {
          text: cryptoText
        });
      } else {
        throw new Error('No data received');
      }
      
      try {
        if (processingMsg && processingMsg.key) {
          await this.sock.sendMessage(sender, { delete: processingMsg.key });
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('Crypto error:', error);
      await this.sock.sendMessage(sender, {
        text: '❌ Failed to fetch price. Try again later.'
      }, { quoted: msg });
    }
  }
}

module.exports = UserCommands;