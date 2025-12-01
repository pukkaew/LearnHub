const fs = require('fs');
const path = 'D:/App/LearnHub/controllers/courseController.js';

let c = fs.readFileSync(path, 'utf8');

if (c.includes('getYoutubeInfo')) {
    console.log('Already fixed!');
    process.exit(0);
}

// Use CRLF for Windows
const NL = '\r\n';

const old = `const materials = result.recordset.map(m => ({${NL}                material_id: m.material_id,${NL}                title: m.title,${NL}                description: m.description || m.content || '',${NL}                content: m.content || '',${NL}                material_type: m.type || m.material_type || 'text',${NL}                file_type: m.type || m.material_type || 'text',${NL}                file_url: m.file_path || m.video_url || m.file_url || '',${NL}                video_url: m.video_url || m.file_path || m.file_url || '',${NL}                file_size: m.file_size || 0,${NL}                mime_type: m.mime_type || '',${NL}                duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),${NL}                is_downloadable: m.is_downloadable !== false,${NL}                is_completed: false,${NL}                progress_percentage: 0${NL}            }));`;

const replacement = `// Helper function to detect YouTube URL${NL}            const getYoutubeInfo = (url) => {${NL}                if (!url) return { is_youtube: false, youtube_embed_url: '' };${NL}                const youtubeRegex = /(?:youtube\\.com\\/(?:[^\\/]+\\/.+\\/|(?:v|e(?:mbed)?)\\/|.*[?&]v=)|youtu\\.be\\/)([^"&?\\/\\s]{11})/;${NL}                const match = url.match(youtubeRegex);${NL}                if (match && match[1]) {${NL}                    return { is_youtube: true, youtube_embed_url: \`https://www.youtube.com/embed/\${match[1]}\` };${NL}                }${NL}                return { is_youtube: false, youtube_embed_url: '' };${NL}            };${NL}${NL}            const materials = result.recordset.map(m => {${NL}                const videoUrl = m.video_url || m.file_path || m.file_url || '';${NL}                const youtubeInfo = getYoutubeInfo(videoUrl);${NL}                return {${NL}                    material_id: m.material_id,${NL}                    title: m.title,${NL}                    description: m.description || m.content || '',${NL}                    content: m.content || '',${NL}                    material_type: youtubeInfo.is_youtube ? 'video' : (m.type || m.material_type || 'text'),${NL}                    file_type: m.type || m.material_type || 'text',${NL}                    file_url: m.file_path || m.video_url || m.file_url || '',${NL}                    video_url: videoUrl,${NL}                    file_size: m.file_size || 0,${NL}                    mime_type: m.mime_type || '',${NL}                    duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),${NL}                    is_downloadable: m.is_downloadable !== false,${NL}                    is_completed: false,${NL}                    progress_percentage: 0,${NL}                    is_youtube: youtubeInfo.is_youtube,${NL}                    youtube_embed_url: youtubeInfo.youtube_embed_url${NL}                };${NL}            });`;

if (c.includes(old)) {
    c = c.replace(old, replacement);
    fs.writeFileSync(path, c, 'utf8');
    console.log('SUCCESS: YouTube fix applied!');

    // Verify immediately
    const verify = fs.readFileSync(path, 'utf8');
    console.log('Verification:', verify.includes('getYoutubeInfo') ? 'PASS' : 'FAIL');
} else {
    console.log('Pattern not found with CRLF either');
}
