const { autoDownload, downloadAudio } = require('bebytdl');

async function downloadMusic(urlOrQuery) {
  try {
    let result;

    // If it's a search term, we still need a URL. 
    // We can use the autoDownload function which handles both.
    // If you pass a search term, it may not work, so we keep using shadowx-ytdl for search only.
    if (urlOrQuery.includes('http')) {
       // Use the reliable API-based audio downloader for direct URLs
       result = await downloadAudio(urlOrQuery);
    } else {
       // Fallback to searching first, then getting the URL.
       const ytdl = require('shadowx-ytdl');
       const search = await ytdl.searchYouTube(urlOrQuery);
       if (!search || !search.results || !search.results.length) {
         throw new Error('No search results');
       }
       result = await downloadAudio(search.results[0].url);
    }

    if (!result || !result.success) {
      throw new Error(result?.error || 'Download failed');
    }

    // bebytdl returns downloadLinks, we need to fetch the actual buffer
    const downloadUrl = result.data.downloadLinks[0].url;
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to fetch audio file');

    const buffer = Buffer.from(await response.arrayBuffer());

    return {
      success: true,
      buffer,
      title: result.data.title || urlOrQuery,
      format: 'mp3'
    };
  } catch (err) {
    console.error('Music download error:', err.message);
    return { success: false, error: 'Music download failed' };
  }
}

module.exports = { downloadMusic, searchAndDownload: downloadMusic };