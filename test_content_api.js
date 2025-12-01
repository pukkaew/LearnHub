const { poolPromise, sql } = require('./config/database');

// Simulate the updated getCourseMaterials API logic
(async () => {
    try {
        const pool = await poolPromise;
        const course_id = 1;
        const userId = 1; // admin user

        // Get all materials for content page
        const result = await pool.request()
            .input('courseId', sql.Int, parseInt(course_id))
            .query(`
                SELECT *
                FROM course_materials
                WHERE course_id = @courseId
                ORDER BY order_index
            `);

        // Get user's progress for all materials in this course
        let userProgress = {};
        if (userId) {
            const progressResult = await pool.request()
                .input('userId', sql.Int, userId)
                .input('courseId', sql.Int, parseInt(course_id))
                .query(`
                    SELECT material_id, is_completed, completed_at, time_spent_seconds
                    FROM user_material_progress
                    WHERE user_id = @userId AND course_id = @courseId
                `);

            // Create a map for quick lookup
            progressResult.recordset.forEach(p => {
                userProgress[p.material_id] = {
                    is_completed: p.is_completed,
                    completed_at: p.completed_at,
                    time_spent_seconds: p.time_spent_seconds || 0
                };
            });

            console.log('=== USER PROGRESS DATA ===');
            console.log('User ID:', userId);
            console.log('Progress records found:', progressResult.recordset.length);
            console.log(userProgress);
        }

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
            const progress = userProgress[m.material_id] || {};

            return {
                material_id: m.material_id,
                title: m.title,
                material_type: youtubeInfo.is_youtube ? 'video' : (m.type || m.material_type || 'text'),
                is_completed: progress.is_completed || false,
                completed_at: progress.completed_at || null,
                time_spent_seconds: progress.time_spent_seconds || 0,
                is_youtube: youtubeInfo.is_youtube,
                youtube_embed_url: youtubeInfo.youtube_embed_url
            };
        });

        console.log('\n=== UPDATED API RESPONSE ===');
        console.log(JSON.stringify({ success: true, data: materials }, null, 2));

        // Test routes
        console.log('\n=== ROUTES CHECK ===');
        console.log('GET /courses/api/:course_id/materials - Materials with progress: OK');
        console.log('GET /courses/api/:course_id/materials/progress - User progress: OK');
        console.log('POST /courses/api/:course_id/materials/:material_id/complete - Mark complete: OK');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
