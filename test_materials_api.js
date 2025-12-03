require('dotenv').config();
const { poolPromise, sql } = require('./config/database');

async function testMaterialsAPI() {
    const pool = await poolPromise;
    const courseId = 2;

    // Simulate what getCourseMaterials does
    const result = await pool.request()
        .input('courseId', sql.Int, courseId)
        .query(`
            SELECT *
            FROM course_materials
            WHERE course_id = @courseId
            ORDER BY order_index
        `);

    const getYoutubeInfo = (url) => {
        if (!url) return { is_youtube: false, youtube_embed_url: '' };
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(youtubeRegex);
        if (match && match[1]) {
            return { is_youtube: true, youtube_embed_url: `https://www.youtube.com/embed/${match[1]}` };
        }
        return { is_youtube: false, youtube_embed_url: '' };
    };

    const isVideoFile = (filePath) => {
        if (!filePath) return false;
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.m4v', '.ogv', '.3gp'];
        const ext = filePath.toLowerCase().split('.').pop();
        return videoExtensions.includes('.' + ext);
    };

    console.log('=== Testing Materials API Logic ===\n');

    result.recordset.forEach(m => {
        console.log(`--- Material ID: ${m.material_id} ---`);
        console.log(`Title: ${m.title}`);
        console.log(`DB Type: ${m.type}`);
        console.log(`File Path: ${m.file_path}`);

        const videoUrl = m.video_url || m.file_path || m.file_url || '';
        console.log(`Video URL (computed): ${videoUrl}`);

        const youtubeInfo = getYoutubeInfo(videoUrl);
        console.log(`Is YouTube: ${youtubeInfo.is_youtube}`);
        console.log(`Is Video File: ${isVideoFile(m.file_path)}`);

        // Determine material type
        let materialType = m.type || m.material_type || 'text';
        console.log(`Initial materialType: ${materialType}`);

        if (youtubeInfo.is_youtube || videoUrl.includes('vimeo.com')) {
            materialType = 'video';
            console.log('-> Changed to video (YouTube/Vimeo)');
        } else if (isVideoFile(m.file_path) || isVideoFile(videoUrl)) {
            materialType = 'video';
            console.log('-> Changed to video (video file extension)');
        } else if (materialType === 'lesson' && m.file_path) {
            materialType = 'video';
            console.log('-> Changed to video (lesson with file_path)');
        }

        console.log(`FINAL material_type: ${materialType}`);
        console.log('');
    });

    process.exit(0);
}

testMaterialsAPI().catch(e => { console.error(e); process.exit(1); });
