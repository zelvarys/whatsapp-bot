const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');

async function downloadMusic(urlOrQuery) {
  try {
    let videoUrl = urlOrQuery;

    // Search first if the input isn't a URL.
    if (!urlOrQuery.includes('http')) {
      const search = await yts(urlOrQuery);
      if (!search?.videos?.length) {
        throw new Error('No search results');
      }
      videoUrl = search.videos[0].url;
    }

    const info = await ytdl.getInfo(videoUrl);
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });

    if (!audioFormat) {
      throw new Error('No audio format found');
    }

    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      ytdl.downloadFromInfo(info, { format: audioFormat })
        .on('data', (chunk) => chunks.push(chunk))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .on('error', reject);
    });

    return {
      success: true,
      buffer,
      title: info.videoDetails?.title || urlOrQuery,
      format: 'mp3'
    };
  } catch (err) {
    console.error('Music download error:', err.message);
    return { success: false, error: 'Music download failed' };
  }
}

module.exports = { downloadMusic, searchAndDownload: downloadMusic };