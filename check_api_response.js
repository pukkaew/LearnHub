const { poolPromise, sql } = require('./config/database');

// Simulate the getCourseMaterials API logic
(async () => {
    try {
        const pool = await poolPromise;
        const course_id = 1;

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
                duration: m.duration_minutes ? `${m.duration_minutes} นาที` : (m.duration || ''),
                is_downloadable: m.is_downloadable !== false,
                is_completed: false,
                progress_percentage: 0,
                is_youtube: youtubeInfo.is_youtube,
                youtube_embed_url: youtubeInfo.youtube_embed_url
            };
        });

        console.log('=== SIMULATED API RESPONSE ===');
        console.log(JSON.stringify({ success: true, data: materials }, null, 2));

        console.log('\n=== KEY ANALYSIS ===');
        materials.forEach((m, i) => {
            console.log('\nMaterial ' + (i+1) + ':');
            console.log('  - Title: ' + m.title);
            console.log('  - material_type: ' + m.material_type);
            console.log('  - is_youtube: ' + m.is_youtube);
            console.log('  - youtube_embed_url: ' + m.youtube_embed_url);
            console.log('  - file_url: ' + m.file_url);
            console.log('  - video_url: ' + m.video_url);
        });

        // Verify frontend rendering logic
        console.log('\n=== FRONTEND RENDERING CHECK ===');
        materials.forEach((m, i) => {
            console.log('\nMaterial ' + (i+1) + ' (' + m.title + '):');
            if (m.material_type === 'video') {
                if (m.is_youtube && m.youtube_embed_url) {
                    console.log('  ✅ Will render as YouTube iframe');
                    console.log('     Embed URL: ' + m.youtube_embed_url);
                } else {
                    console.log('  📹 Will render as regular video player');
                    console.log('     Video URL: ' + (m.file_url || m.video_url));
                }
            } else {
                console.log('  ⚠️ Will render as ' + m.material_type + ' type');
                console.log('     Expected: video');
            }
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
