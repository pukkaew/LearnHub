const fs = require('fs');
const p = 'D:/App/LearnHub/controllers/courseController.js';
let c = fs.readFileSync(p, 'utf8');

// Check if already has getYoutubeInfo
if (c.includes('getYoutubeInfo')) {
    console.log('Already has YouTube detection');
    process.exit(0);
}

// Find and replace the materials mapping
const oldCode = `const materials = result.recordset.map(m => ({
                material_id: m.material_id,
                title: m.title,
                description: m.description || m.content || '',
                content: m.content || '',
                material_type: m.type || m.material_type || 'text',
                file_type: m.type || m.material_type || 'text',
                file_url: m.file_path || m.video_url || m.file_url || '',
                video_url: m.video_url || m.file_path || m.file_url || '',
                file_size: m.file_size || 0,
                mime_type: m.mime_type || '',
                duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),
                is_downloadable: m.is_downloadable !== false,
                is_completed: false, is_youtube: false,
                progress_percentage: 0
            }));`;

const newCode = `// Helper function to detect YouTube URL
            const getYoutubeInfo = (url) => {
                if (!url) return { is_youtube: false, youtube_embed_url: '' };
                const youtubeRegex = /(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?\\/\\s]{11})/;
                const match = url.match(youtubeRegex);
                if (match && match[1]) {
                    return { is_youtube: true, youtube_embed_url: \`https://www.youtube.com/embed/\${match[1]}\` };
                }
                return { is_youtube: false, youtube_embed_url: '' };
            };

            const materials = result.recordset.map(m => {
                const videoUrl = m.video_url || m.file_path || m.file_url || '';
                const youtubeInfo = getYoutubeInfo(videoUrl);
                return {
                    material_id: m.material_id,
                    title: m.title,
                    description: m.description || m.content || '',
                    content: m.content || '',
                    material_type: youtubeInfo.is_youtube ? 'video' : (m.type || m.material_type || 'text'),
                    file_type: m.type || m.material_type || 'text',
                    file_url: m.file_path || m.video_url || m.file_url || '',
                    video_url: videoUrl,
                    file_size: m.file_size || 0,
                    mime_type: m.mime_type || '',
                    duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),
                    is_downloadable: m.is_downloadable !== false,
                    is_completed: false,
                    progress_percentage: 0,
                    is_youtube: youtubeInfo.is_youtube,
                    youtube_embed_url: youtubeInfo.youtube_embed_url
                };
            });`;

if (c.includes(oldCode)) {
    c = c.replace(oldCode, newCode);
    fs.writeFileSync(p, c);
    console.log('Updated with YouTube detection');
} else {
    console.log('Old code not found, trying simpler approach...');
    // Try simpler replacement
    c = c.replace('is_completed: false, is_youtube: false,', 'is_completed: false,');
    c = c.replace(
        'is_completed: false,\n                progress_percentage: 0',
        `is_completed: false,
                progress_percentage: 0,
                is_youtube: ((m.video_url || m.file_path || '').match(/youtube\\.com|youtu\\.be/) !== null),
                youtube_embed_url: (function(url) {
                    if (!url) return '';
                    const match = url.match(/(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?\\/\\s]{11})/);
                    return match ? 'https://www.youtube.com/embed/' + match[1] : '';
                })(m.video_url || m.file_path || '')`
    );
    fs.writeFileSync(p, c);
    console.log('Applied simpler YouTube detection');
}
