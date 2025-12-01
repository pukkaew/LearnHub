const fs = require('fs');
const path = 'D:/App/LearnHub/controllers/courseController.js';

// Read current file
let content = fs.readFileSync(path, 'utf8');

// Check if fix already applied
if (content.includes('getYoutubeInfo')) {
    console.log('YouTube fix already applied!');
    process.exit(0);
}

// Old code to find
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
                is_completed: false,
                progress_percentage: 0
            }));`;

// New code with YouTube detection
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

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(path, content, 'utf8');
    console.log('SUCCESS: YouTube fix applied!');
} else {
    console.log('ERROR: Old code pattern not found');
    console.log('Searching for materials mapping...');

    // Try to find what we have
    const startPattern = 'const materials = result.recordset.map(m => ({';
    const idx = content.indexOf(startPattern);
    if (idx > -1) {
        console.log('Found materials mapping at index:', idx);
        console.log('Content around it:');
        console.log(content.substring(idx, idx + 500));
    } else {
        console.log('No materials mapping found');
    }
}
