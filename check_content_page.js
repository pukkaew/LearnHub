const { poolPromise, sql } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Check course_materials table structure
        const structure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'course_materials'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('=== course_materials TABLE STRUCTURE ===');
        console.table(structure.recordset);

        // Check materials for course_id = 1
        const materials = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT * FROM course_materials WHERE course_id = @courseId ORDER BY order_index');
        console.log('\n=== MATERIALS FOR COURSE 1 ===');
        console.log('Count:', materials.recordset.length);
        if (materials.recordset.length > 0) {
            materials.recordset.forEach((m, i) => {
                console.log('\n[' + (i+1) + '] ID:' + m.material_id + ', Title: ' + m.title);
                console.log('    Type: ' + m.type + ', Order: ' + m.order_index);
                console.log('    File Path: ' + (m.file_path || 'N/A'));
                console.log('    Video URL: ' + (m.video_url || 'N/A'));
                console.log('    Duration: ' + (m.duration_minutes || 'N/A') + ' mins');
                console.log('    Content: ' + (m.content ? m.content.substring(0, 100) + '...' : 'N/A'));
            });
        } else {
            console.log('No materials found');
        }

        // Check course 1 info
        const course = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT course_id, course_name, course_code, status FROM courses WHERE course_id = @courseId');
        console.log('\n=== COURSE 1 INFO ===');
        console.log(course.recordset[0]);

        // Check user_courses for course 1
        const enrollments = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT COUNT(*) as count FROM user_courses WHERE course_id = @courseId');
        console.log('\n=== ENROLLMENTS FOR COURSE 1 ===');
        console.log('Total:', enrollments.recordset[0].count);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
