const fs = require('fs');
const path = 'D:/App/LearnHub/controllers/courseController.js';

// Read current file
let content = fs.readFileSync(path, 'utf8');

// Check if fix already applied
if (content.includes('getYoutubeInfo')) {
    console.log('YouTube fix already applied!');
    process.exit(0);
}

// Find the getCourseMaterials function and insert YouTube helper
const searchStart = 'async getCourseMaterials(req, res) {';
const startIdx = content.indexOf(searchStart);

if (startIdx === -1) {
    console.log('ERROR: getCourseMaterials function not found');
    process.exit(1);
}

// Find the materials mapping line
const mappingSearch = 'const materials = result.recordset.map(m => ({';
const mappingIdx = content.indexOf(mappingSearch, startIdx);

if (mappingIdx === -1) {
    console.log('ERROR: materials mapping not found');
    process.exit(1);
}

// Find the end of the mapping - look for }));
let braceCount = 0;
let inMapping = false;
let endIdx = -1;

for (let i = mappingIdx; i < content.length; i++) {
    if (content[i] === '(') braceCount++;
    if (content[i] === ')') {
        braceCount--;
        if (braceCount === 0 && content.substring(i, i+3) === '));') {
            endIdx = i + 3;
            break;
        }
    }
}

if (endIdx === -1) {
    console.log('ERROR: End of mapping not found');
    process.exit(1);
}

// Extract and replace
const oldMapping = content.substring(mappingIdx, endIdx);
console.log('Found mapping from', mappingIdx, 'to', endIdx);
console.log('Old mapping length:', oldMapping.length);

const newMapping = `// Helper function to detect YouTube URL
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

const newContent = content.substring(0, mappingIdx) + newMapping + content.substring(endIdx);

fs.writeFileSync(path, newContent, 'utf8');
console.log('SUCCESS: YouTube detection fix applied!');

// Verify
const verify = fs.readFileSync(path, 'utf8');
if (verify.includes('getYoutubeInfo')) {
    console.log('VERIFIED: Fix is in place!');
} else {
    console.log('WARNING: Fix may not have persisted');
}
