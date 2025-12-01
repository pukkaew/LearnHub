const url = 'https://www.youtube.com/watch?v=BrMpTglfBHM';

// Test detection
const detectMaterialType = (filePath) => {
    if (!filePath) return 'text';
    const urlLower = filePath.toLowerCase();
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
        return 'youtube';
    }
    return 'text';
};

// Test YouTube embed URL extraction
const getYoutubeEmbedUrl = (url) => {
    if (!url) return '';
    let videoId = '';
    const watchMatch = url.match(/[?&]v=([^&#]+)/);
    if (watchMatch) videoId = watchMatch[1];
    const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
    if (shortMatch) videoId = shortMatch[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
};

const detectedType = detectMaterialType(url);
const embedUrl = getYoutubeEmbedUrl(url);

console.log('Input URL:', url);
console.log('Detected Type:', detectedType);
console.log('Embed URL:', embedUrl);
console.log('is_youtube:', detectedType === 'youtube');
