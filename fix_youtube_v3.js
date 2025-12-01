const fs = require('fs');
const path = 'D:/App/LearnHub/controllers/courseController.js';

let c = fs.readFileSync(path, 'utf8');

if (c.includes('getYoutubeInfo')) {
    console.log('Already fixed!');
    process.exit(0);
}

const old = `const materials = result.recordset.map(m => ({
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

const replacement = `// Helper function to detect YouTube URL
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

if (c.includes(old)) {
    c = c.replace(old, replacement);
    fs.writeFileSync(path, c, 'utf8');
    console.log('SUCCESS: YouTube fix applied!');

    // Verify
    setTimeout(() => {
        const verify = fs.readFileSync(path, 'utf8');
        console.log('Verification:', verify.includes('getYoutubeInfo') ? 'PASS' : 'FAIL');
    }, 500);
} else {
    console.log('Pattern not found - checking exact chars...');
    const idx = c.indexOf('const materials = result.recordset.map(m => ({');
    if (idx > -1) {
        // Get exact substring for debugging
        const exact = c.substring(idx, idx + old.length);
        console.log('Expected length:', old.length);
        console.log('Checking char by char...');
        for (let i = 0; i < Math.min(old.length, 100); i++) {
            if (old[i] !== exact[i]) {
                console.log('Diff at', i, ':', old.charCodeAt(i), 'vs', exact.charCodeAt(i));
                break;
            }
        }
    }
}
