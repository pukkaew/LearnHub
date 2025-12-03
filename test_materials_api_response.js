require('dotenv').config();
const { poolPromise, sql } = require('./config/database');

async function testMaterialsAPI() {
    try {
        const pool = await poolPromise;
        const course_id = 5;

        // Get all materials for content page using SELECT *
        const result = await pool.request()
            .input('courseId', sql.Int, parseInt(course_id))
            .query(`
                SELECT *
                FROM course_materials
                WHERE course_id = @courseId
                ORDER BY order_index
            `);

        // Helper function to detect YouTube URL
        const getYoutubeInfo = (url) => {
            if (!url) return { is_youtube: false, youtube_embed_url: '' };
            const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = url.match(youtubeRegex);
            if (match && match[1]) {
                return { is_youtube: true, youtube_embed_url: `https://www.youtube.com/embed/${match[1]}` };
            }
            return { is_youtube: false, youtube_embed_url: '' };
        };

        // Helper to detect video file by extension
        const isVideoFile = (filePath) => {
            if (!filePath) return false;
            const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.m4v', '.ogv', '.3gp'];
            const ext = filePath.toLowerCase().split('.').pop();
            return videoExtensions.includes('.' + ext);
        };

        console.log('=== Simulating getCourseMaterials API Response ===\n');

        const materials = result.recordset.map(m => {
            const videoUrl = m.video_url || m.file_path || m.file_url || '';
            const youtubeInfo = getYoutubeInfo(videoUrl);

            // Determine material type
            let materialType = m.type || m.material_type || 'text';
            const originalType = materialType;

            // IMPORTANT: Keep 'document' type as-is, don't convert to video
            if (materialType === 'document') {
                console.log(`📄 Material ${m.material_id}: Keeping as document - ${m.title}`);
            } else if (youtubeInfo.is_youtube || videoUrl.includes('vimeo.com')) {
                materialType = 'video';
            } else if (isVideoFile(m.file_path) || isVideoFile(videoUrl)) {
                materialType = 'video';
            } else if (materialType === 'lesson') {
                if (m.file_path && (isVideoFile(m.file_path) || youtubeInfo.is_youtube || m.file_path.includes('vimeo.com'))) {
                    materialType = 'video';
                } else if (m.content || m.description) {
                    materialType = 'text';
                } else {
                    materialType = 'text';
                }
            }

            console.log(`Material ${m.material_id}: ${m.title}`);
            console.log(`  Original type: ${originalType}`);
            console.log(`  Final material_type: ${materialType}`);
            console.log(`  file_path: ${m.file_path || 'NULL'}`);
            console.log(`  is_youtube: ${youtubeInfo.is_youtube}`);
            console.log(`  youtube_embed_url: ${youtubeInfo.youtube_embed_url || 'N/A'}`);
            console.log('');

            return {
                material_id: m.material_id,
                title: m.title,
                description: m.description || m.content || '',
                content: m.content || '',
                material_type: materialType,
                file_type: m.type || m.material_type || 'text',
                file_url: m.file_path || '',
                video_url: videoUrl,
                is_youtube: youtubeInfo.is_youtube,
                youtube_embed_url: youtubeInfo.youtube_embed_url
            };
        });

        console.log('=== Final API Response Data ===');
        console.log(JSON.stringify(materials, null, 2));

    } catch (error) {
        console.error('Error:', error.message);
    }
    process.exit(0);
}

testMaterialsAPI();
