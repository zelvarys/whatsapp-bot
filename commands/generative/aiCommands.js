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
    
    try {
      const aiResponse = await AIService.getGeminiAIResponse(question, userJid);
      await this.sock.sendMessage(sender, { text: aiResponse }, { quoted: msg });
    } catch (error) {
      console.error('❌ Error in AI command:', error);
      await this.sock.sendMessage(sender, {
        text: "❌ I encountered an error while processing your request. Try again later!"
      }, { quoted: msg });
    }
  }
  
  async write(sender, userJid, msg, fullText) {
    if (!fullText) {
      await this.sock.sendMessage(sender, {
        text: `❌ Provide a prompt!\n*Usage:* ${config.prefix}story [prompt]`
      }, { quoted: msg });
      return;
    }
    
    const prompt = fullText;
    if (prompt.length > 300) {
      await this.sock.sendMessage(sender, {
        text: "❌ Prompt too long! Keep it under 300 characters."
      }, { quoted: msg });
      return;
    }
    
    try {
      const result = await AIService.generateStory(prompt, userJid);
      
      if (!result.success) {
        await this.sock.sendMessage(sender, {
          text: `❌ ${result.error}`
        }, { quoted: msg });
        return;
      }
      
      await this.sock.sendMessage(sender, {
        text: result.story
      }, { quoted: msg });
      
    } catch (error) {
      console.error('❌ Error in story command:', error);
      await this.sock.sendMessage(sender, {
        text: "❌ Story generation failed. Try again later."
      }, { quoted: msg });
    }
  }
}

module.exports = AICommands;