const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class MusicDownloader {
  static async ensureYTDLP() {
    try {
      await execPromise('which yt-dlp');
      return true;
    } catch (error) {
      console.log('⚠️ yt-dlp not found, trying to install...');
      try {
        await execPromise('which pip');
        await execPromise('pip install yt-dlp --quiet');
        return true;
      } catch (installError) {
        console.error('❌ Failed to install yt-dlp:', installError.message);
        return false;
      }
    }
  }

  static async downloadWithYTDLP(query) {
    try {
      const hasYTDLP = await this.ensureYTDLP();
      if (!hasYTDLP) {
        throw new Error('yt-dlp not available');
      }

      const tempFile = `./temp/audio_${Date.now()}.mp3`;
      
      let command;
      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        command = `yt-dlp -x --audio-format mp3 --audio-quality 128k -o "${tempFile}" "${query}"`;
      } else {
        command = `yt-dlp -x --audio-format mp3 --audio-quality 128k -o "${tempFile}" "ytsearch1:${query}"`;
      }
      
      console.log(`📥 Downloading: ${query}`);
      await execPromise(command, { timeout: 180000 });
      
      if (fs.existsSync(tempFile)) {
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);
        
        return {
          success: true,
          buffer: buffer,
          title: query,
          artist: 'Downloaded Music',
          format: 'mp3'
        };
      }
      
      throw new Error('Download failed - file not created');
    } catch (error) {
      console.error('YT-DLP error:', error.message);
      throw error;
    }
  }

  static async downloadWithSimpleAPI(query) {
    try {
      const apiEndpoints = [
        `https://api.davidcyril.com/api/download/youtube?url=${encodeURIComponent(query)}`,
        `https://yt-api.p.rapidapi.com/dl?id=${encodeURIComponent(query)}`,
        `https://youtube-mp36.p.rapidapi.com/dl?id=${encodeURIComponent(query)}`
      ];
      
      for (const apiUrl of apiEndpoints) {
        try {
          console.log(`Trying API: ${apiUrl.substring(0, 50)}...`);
          
          const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
          });
          
          if (response.data) {
            let downloadUrl = null;
            let title = 'Downloaded Music';
            
            if (response.data.videoUrl) {
              downloadUrl = response.data.videoUrl;
              title = response.data.title || title;
            } else if (response.data.link) {
              downloadUrl = response.data.link;
              title = response.data.title || title;
            } else if (response.data.downloadUrl) {
              downloadUrl = response.data.downloadUrl;
              title = response.data.title || title;
            }
            
            if (downloadUrl) {
              console.log(`Found download URL: ${downloadUrl.substring(0, 50)}...`);
              const audioResponse = await axios.get(downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
              });
              
              return {
                success: true,
                buffer: Buffer.from(audioResponse.data),
                title: title,
                artist: 'YouTube',
                format: 'mp3'
              };
            }
          }
        } catch (apiError) {
          console.log(`API failed: ${apiError.message}`);
          continue;
        }
      }
      
      throw new Error('All APIs failed');
    } catch (error) {
      console.error('Simple API error:', error.message);
      throw error;
    }
  }

  static async searchAndDownloadMusic(query) {
    console.log(`🎵 Searching for: "${query}"`);
    
    try {
      console.log(`🔄 Trying yt-dlp...`);
      const result = await this.downloadWithYTDLP(query);
      if (result.success) {
        console.log(`✅ Success with yt-dlp!`);
        return result;
      }
    } catch (error) {
      console.log(`❌ yt-dlp failed: ${error.message}`);
    }
    
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      try {
        const videoId = this.extractVideoId(query);
        if (videoId) {
          console.log(`🔄 Trying with video ID: ${videoId}`);
          const directResult = await this.downloadWithSimpleAPI(`https://youtube.com/watch?v=${videoId}`);
          if (directResult.success) {
            return directResult;
          }
        }
      } catch (directError) {
        console.log('❌ Direct URL download failed:', directError.message);
      }
    }
    
    try {
      console.log(`🔄 Trying API with search...`);
      const apiResult = await this.downloadWithSimpleAPI(query);
      if (apiResult.success) {
        return apiResult;
      }
    } catch (apiError) {
      console.log('❌ API search failed:', apiError.message);
    }
    
    throw new Error('Download failed.');
  }

  static async downloadMusic(url) {
    try {
      console.log(`🎵 Direct download from: ${url}`);
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return await this.downloadWithYTDLP(url);
      } else {
        return await this.searchAndDownloadMusic(url);
      }
    } catch (error) {
      console.error('Music download error:', error);
      throw new Error(`Music download failed: ${error.message}`);
    }
  }

  static extractVideoId(url) {
    try {
      if (url.includes('youtube.com/watch?v=')) {
        return url.split('v=')[1]?.split('&')[0];
      } else if (url.includes('youtu.be/')) {
        return url.split('youtu.be/')[1]?.split('?')[0];
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = MusicDownloader;