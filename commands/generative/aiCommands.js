const config = require('../../config');
const AIService = require('../../utils/generative/aiService');

class AICommands {
  constructor(sock) {
    this.sock = sock;
  }
  
  async ask(sender, userJid, msg, fullText) {
    if (!fullText) {
      await this.sock.sendMessage(sender, {
        text: `❌ Provide a question!\n*Usage:* ${config.prefix}ask [your question]`
      }, { quoted: msg });
      return;
    }
    
    const question = fullText;
    if (question.length > 500) {
      await this.sock.sendMessage(sender, {
        text: "❌ Question too long! Keep it under 500 characters."
      }, { quoted: msg });
      return;
    }
    
    const thinkingMsg = await this.sock.sendMessage(sender, {
      text: `🤔 *Thinking...*`
    });
    
    try {
      const aiResponse = await AIService.getGeminiAIResponse(question, userJid);
      
      const responseText = `✧ *AI Response*
╒═══════════════════╕

▸ *Question:* ${question}

▸ *Answer:* ${aiResponse}

╘═══════════════════╛
▸  _Powered by ${config.botName}_`;
      
      await this.sock.sendMessage(sender, { text: responseText });
      
      try {
        if (thinkingMsg && thinkingMsg.key) {
          await this.sock.sendMessage(sender, { delete: thinkingMsg.key });
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('❌ Error in AI command:', error);
      await this.sock.sendMessage(sender, {
        text: "❌ I encountered an error while processing your request. Try again later!"
      });
    }
  }
  
  async image(sender, userJid, msg, fullText) {
    if (!fullText) {
      await this.sock.sendMessage(sender, {
        text: `❌ Provide a prompt!\n*Usage:* ${config.prefix}image [prompt]`
      }, { quoted: msg });
      return;
    }
    
    const prompt = fullText;
    if (prompt.length > 200) {
      await this.sock.sendMessage(sender, {
        text: "❌ Prompt too long! Keep it under 200 characters."
      }, { quoted: msg });
      return;
    }
    
    const generatingMsg = await this.sock.sendMessage(sender, {
      text: `🎨 *Generating image...*`
    });
    
    try {
      const imageResult = await AIService.generateImageGemini(prompt, userJid);
      
      if (!imageResult.success) {
        await this.sock.sendMessage(sender, {
          text: `❌ ${imageResult.error}`
        });
        return;
      }
      
      await this.sock.sendMessage(sender, {
        image: imageResult.imageBuffer,
        caption: `┌─⊶✧ *AI Generated Image*
│ *Prompt:* ${prompt}
└─────────────⊶
 ▸ _Powered by ${config.botName}_`
      });
      
      try {
        if (generatingMsg && generatingMsg.key) {
          await this.sock.sendMessage(sender, { delete: generatingMsg.key });
        }
      } catch (e) {}
      
    } catch (error) {
      console.error('❌ Error in image command:', error);
      
      await this.sock.sendMessage(sender, {
        text: "❌ Image generation failed."
      });
    }
  }
}

module.exports = AICommands;