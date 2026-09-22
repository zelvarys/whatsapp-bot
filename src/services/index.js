module.exports = {
  ai: {
    gemini: require('./ai/geminiClient'),
    story: require('./ai/storyGenerator'),
    chatbot: require('./ai/chatbotConversation'),
    translation: require('./ai/translationEngine')
  },
  media: {
    video: require('./media/videoDownloaders'),
    music: require('./media/musicDownloader'),
    processing: require('./media/mediaProcessing'),
    tts: require('./media/textToSpeechEngine')
  },
  external: {
    crypto: require('./external/cryptoClient'),
    dictionary: require('./external/dictionaryClient'),
    weather: require('./external/weatherClient')
  }
};