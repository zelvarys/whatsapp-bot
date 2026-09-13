const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class MediaDownloader {
  static async ensureYTDLP() {
    try {
      await execPromise('which yt-dlp');
      return true;
    } catch (error) {
      console.log('⚠️ yt-dlp not found, trying to install...');
      try {
        //await execPromise('pip install yt-dlp');
        return true;
      } catch (installError) {
        console.error('❌ Failed to install yt-dlp:', installError.message);
        return false;
      }
    }
  }

  static async downloadWithYTDLP(url) {
    try {
      const hasYTDLP = await this.ensureYTDLP();
      if (!hasYTDLP) {
        throw new Error('yt-dlp not available');
      }

      const tempFile = `./temp/video_${Date.now()}.mp4`;
      
      const infoCommand = `yt-dlp --get-title --get-thumbnail "${url}"`;
      const info = await execPromise(infoCommand);
      const lines = info.stdout.split('\n');
      const title = lines[0] || 'Downloaded Video';
      
      const downloadCommand = `yt-dlp -f "best[height<=720]" --merge-output-format mp4 --output "${tempFile}" "${url}"`;
      await execPromise(downloadCommand, { timeout: 120000 });
      
      if (fs.existsSync(tempFile)) {
        const buffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);
        
        return {
          success: true,
          buffer: buffer,
          title: title,
          type: 'video/mp4'
        };
      }
      
      throw new Error('Download failed');
    } catch (error) {
      console.error('YT-DLP error:', error.message);
      throw error;
    }
  }

  static async downloadYouTube(url) {
    try {
      try {
        return await this.downloadWithYTDLP(url);
      } catch (ytdlpError) {
        console.log('YT-DLP failed, trying API methods...');
      }

      const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      if (!videoIdMatch) {
        throw new Error('Invalid YouTube URL');
      }
      const videoId = videoIdMatch[1];

      try {
        const apiUrl = 'https://api.y2mate.guru/api/convert';
        
        const formData = new URLSearchParams();
        formData.append('url', `https://www.youtube.com/watch?v=${videoId}`);
        
        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          },
          timeout: 30000
        });
        
        if (response.data && response.data.url) {
          const videoResponse = await axios.get(response.data.url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: 100 * 1024 * 1024
          });
          
          return {
            success: true,
            buffer: Buffer.from(videoResponse.data),
            title: response.data.title || 'YouTube Video',
            author: response.data.author || 'Unknown'
          };
        }
      } catch (error) {
        console.log('Method 1 failed');
      }

      try {
        const apiUrl = `https://video-downloader-api.vercel.app/download?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.downloadUrl) {
          const videoResponse = await axios.get(response.data.downloadUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          return {
            success: true,
            buffer: Buffer.from(videoResponse.data),
            title: response.data.title || 'YouTube Video'
          };
        }
      } catch (error) {
        console.log('Method 2 failed');
      }

      try {
        const apiUrl = `https://api.davidcyril.com/api/download/youtube?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.videoUrl) {
          const videoResponse = await axios.get(response.data.videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
          });
          
          return {
            success: true,
            buffer: Buffer.from(videoResponse.data),
            title: response.data.title || 'YouTube Video'
          };
        }
      } catch (error) {
        console.log('Method 3 failed');
      }
      
    } catch (error) {
      console.error('YouTube error:', error.message);
    }
  }

  static async downloadInstagram(url) {
    try {
      try {
        return await this.downloadWithYTDLP(url);
      } catch (ytdlpError) {
        console.log('YT-DLP failed, trying API methods...');
      }

      try {
        const apiUrl = 'https://instagram-downloader-api.vercel.app/download';
        
        const formData = new URLSearchParams();
        formData.append('url', url);
        
        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          },
          timeout: 30000
        });
        
        if (response.data && response.data.media) {
          const mediaUrl = Array.isArray(response.data.media) ? response.data.media[0] : response.data.media;
          const mediaResponse = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          return {
            success: true,
            buffer: Buffer.from(mediaResponse.data),
            title: 'Instagram Media',
            type: response.data.type || 'video'
          };
        }
      } catch (error) {
        console.log('Method 1 failed');
      }

      try {
        const apiUrl = `https://api.davidcyril.com/api/download/instagram?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.mediaUrl) {
          const mediaResponse = await axios.get(response.data.mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          return {
            success: true,
            buffer: Buffer.from(mediaResponse.data),
            title: response.data.title || 'Instagram Media'
          };
        }
      } catch (error) {
        console.log('Method 2 failed');
      }
      
    } catch (error) {
      console.error('Instagram error:', error.message);
    }
  }

  static async downloadTikTok(url) {
    try {
      try {
        return await this.downloadWithYTDLP(url);
      } catch (ytdlpError) {
        console.log('YT-DLP failed, trying API methods...');
      }

      try {
        const apiUrl = 'https://tiktok-downloader-api.vercel.app/download';
        
        const formData = new URLSearchParams();
        formData.append('url', url);
        
        const response = await axios.post(apiUrl, formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          },
          timeout: 30000
        });
        
        if (response.data && response.data.videoUrl) {
          const videoResponse = await axios.get(response.data.videoUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          return {
            success: true,
            buffer: Buffer.from(videoResponse.data),
            title: response.data.title || 'TikTok Video',
            author: response.data.author || 'TikTok User'
          };
        }
      } catch (error) {
        console.log('Method 1 failed');
      }

      try {
        const apiUrl = `https://api.davidcyril.com/api/download/tiktok?url=${encodeURIComponent(url)}`;
        
        const response = await axios.get(apiUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
          }
        });
        
        if (response.data && response.data.videoUrl) {
          const videoResponse = await axios.get(response.data.videoUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
          });
          
          return {
            success: true,
            buffer: Buffer.from(videoResponse.data),
            title: response.data.title || 'TikTok Video'
          };
        }
      } catch (error) {
        console.log('Method 2 failed');
      }

      
    } catch (error) {
      console.error('TikTok error:', error.message);
    }
  }

  static async downloadMedia(url) {
    try {
      url = url.trim();
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return await this.downloadYouTube(url);
      } else if (url.includes('instagram.com')) {
        return await this.downloadInstagram(url);
      } else if (url.includes('tiktok.com')) {
        return await this.downloadTikTok(url);
      } else {
        try {
          return await this.downloadWithYTDLP(url);
        } catch (error) {
          throw new Error('❌ Unsupported platform. Use YouTube, Instagram, or TikTok.');
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      throw new Error(`Download failed`);
    }
  }
}

module.exports = MediaDownloader;