const fs = require('fs');

const filePath = 'D:/App/LearnHub/controllers/courseController.js';
let content = fs.readFileSync(filePath, 'utf8');

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
                is_completed: m.user_completed === true || m.user_completed === 1,
                completed_at: m.completed_at,
                time_spent_seconds: m.time_spent_seconds || 0,
                progress_percentage: m.user_completed ? 100 : 0
            }));`;

const newCode = `// Helper function to detect content type from URL/file_path
            const detectMaterialType = (filePath, mimeType, originalType) => {
                if (!filePath) return originalType || 'text';
                const url = filePath.toLowerCase();
                // Detect YouTube
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    return 'youtube';
                }
                // Detect video files
                if (url.match(/\\.(mp4|webm|ogg|mov|avi)$/)) {
                    return 'video';
                }
                // Detect documents
                if (url.match(/\\.(pdf)$/)) {
                    return 'document';
                }
                // Detect images
                if (url.match(/\\.(jpg|jpeg|png|gif|webp|svg)$/)) {
                    return 'image';
                }
                // Detect audio
                if (url.match(/\\.(mp3|wav|ogg|m4a)$/)) {
                    return 'audio';
                }
                // Check mime type
                if (mimeType) {
                    if (mimeType.startsWith('video/')) return 'video';
                    if (mimeType.startsWith('audio/')) return 'audio';
                    if (mimeType.startsWith('image/')) return 'image';
                    if (mimeType === 'application/pdf') return 'document';
                }
                return originalType || 'text';
            };

            // Helper function to get YouTube embed URL
            const getYoutubeEmbedUrl = (url) => {
                if (!url) return '';
                let videoId = '';
                // youtube.com/watch?v=VIDEO_ID
                const watchMatch = url.match(/[?&]v=([^&#]+)/);
                if (watchMatch) videoId = watchMatch[1];
                // youtu.be/VIDEO_ID
                const shortMatch = url.match(/youtu\\.be\\/([^?&#]+)/);
                if (shortMatch) videoId = shortMatch[1];
                // youtube.com/embed/VIDEO_ID
                const embedMatch = url.match(/youtube\\.com\\/embed\\/([^?&#]+)/);
                if (embedMatch) videoId = embedMatch[1];
                return videoId ? \`https://www.youtube.com/embed/\${videoId}\` : '';
            };

            const materials = result.recordset.map(m => {
                const filePath = m.file_path || m.video_url || m.file_url || '';
                const detectedType = detectMaterialType(filePath, m.mime_type, m.type);
                const isYoutube = detectedType === 'youtube';

                return {
                    material_id: m.material_id,
                    title: m.title,
                    description: m.description || m.content || '',
                    content: m.content || '',
                    material_type: isYoutube ? 'video' : detectedType,
                    file_type: detectedType,
                    is_youtube: isYoutube,
                    youtube_embed_url: isYoutube ? getYoutubeEmbedUrl(filePath) : '',
                    file_url: filePath,
                    video_url: filePath,
                    file_size: m.file_size || 0,
                    mime_type: m.mime_type || '',
                    duration: m.duration_minutes ? \`\${m.duration_minutes} นาที\` : (m.duration || ''),
                    is_downloadable: m.is_downloadable !== false,
                    is_completed: m.user_completed === true || m.user_completed === 1,
                    completed_at: m.completed_at,
                    time_spent_seconds: m.time_spent_seconds || 0,
                    progress_percentage: m.user_completed ? 100 : 0
                };
            });`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Updated getCourseMaterials API');
} else {
    console.log('❌ Old code not found - may already be updated');
    // Try to find a pattern
    if (content.includes('detectMaterialType')) {
        console.log('✅ Already has detectMaterialType function');
    }
}
