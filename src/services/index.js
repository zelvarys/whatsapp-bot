module.exports = {
  ai: {
    gemini: require('./ai/geminiClient'),
    story: require('./ai/storyGenerator'),
    chatbot: require('./ai/chatbotConversation'),
    translation: require('./ai/translationEngine')
  },
  media: {
    youtube: require('./media/youtubeDownloader'),
    tiktok: require('./media/tiktokDownloader'),
    facebook: require('./media/facebookDownloader'),
    universal: require('./media/universalDownloader'),
    music: require('./media/musicDownloader'),
    tts: require('./media/textToSpeechEngine'),
    sticker: require('./media/stickerProcessor'),
    compressor: require('./media/mediaCompressor'),
    pdf: require('./media/pdfConverter')
  },
  external: {
    crypto: require('./external/coinGeckoClient'),
    qrcode: require('./external/qrCodeGenerator'),
    dictionary: require('./external/dictionaryClient'),
    weather: require('./external/weatherClient')
  }
};