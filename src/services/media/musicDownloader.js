// musicDownloader.js
const untube = require('untube');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');

async function downloadMusic(urlOrQuery) {
  try {
    let videoUrl = urlOrQuery;

    if (!urlOrQuery.includes('http')) {
      const search = await yts(urlOrQuery);
      if (!search?.videos?.length) throw new Error('No search results');
      videoUrl = search.videos[0].url;
    }

    const tempPath = path.join('./temp', `song_${Date.now()}.mp3`);

    return new Promise((resolve) => {
      const stream = untube(videoUrl, { format: 'highestaudio', filter: 'audioonly' });
      
      stream.pipe(fs.createWriteStream(tempPath));
      
      stream.on('end', () => {
        const buffer = fs.readFileSync(tempPath);
        fs.unlinkSync(tempPath);
        resolve({ success: true, buffer, title: 'Downloaded', format: 'mp3' });
      });
      
      stream.on('error', (err) => {
        console.error('Music download error:', err.message);
        resolve({ success: false, error: 'Music download failed' });
      });
    });
  } catch (err) {
    console.error('Music download error:', err.message);
    return { success: false, error: 'Music download failed' };
  }
}

module.exports = { downloadMusic, searchAndDownload: downloadMusic };