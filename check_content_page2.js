const { poolPromise, sql } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Check courses table structure
        const courseStructure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('=== courses TABLE STRUCTURE ===');
        console.table(courseStructure.recordset);

        // Check course 1 info using correct column names
        const course = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT * FROM courses WHERE course_id = @courseId');
        console.log('\n=== COURSE 1 INFO ===');
        if (course.recordset.length > 0) {
            const c = course.recordset[0];
            console.log('course_id:', c.course_id);
            console.log('title:', c.title);
            console.log('course_code:', c.course_code);
            console.log('status:', c.status);
            console.log('category:', c.category);
            console.log('instructor_id:', c.instructor_id);
            console.log('description:', c.description ? c.description.substring(0, 100) + '...' : 'N/A');
        } else {
            console.log('Course not found');
        }

        // Check user_courses for course 1
        const enrollments = await pool.request()
            .input('courseId', sql.Int, 1)
            .query(`
                SELECT uc.*, u.first_name, u.last_name, u.email
                FROM user_courses uc
                LEFT JOIN users u ON uc.user_id = u.user_id
                WHERE uc.course_id = @courseId
            `);
        console.log('\n=== ENROLLMENTS FOR COURSE 1 ===');
        console.log('Total:', enrollments.recordset.length);
        if (enrollments.recordset.length > 0) {
            enrollments.recordset.slice(0, 5).forEach((e, i) => {
                console.log('\n[' + (i+1) + '] User: ' + e.first_name + ' ' + e.last_name + ' (' + e.email + ')');
                console.log('    Status: ' + e.status + ', Progress: ' + (e.progress_percentage || 0) + '%');
            });
        }

        // Check user_material_progress table if exists
        const progressTable = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'user_material_progress'
        `);
        console.log('\n=== user_material_progress TABLE EXISTS ===');
        console.log(progressTable.recordset[0].count > 0 ? 'Yes' : 'No');

        if (progressTable.recordset[0].count > 0) {
            const progressStructure = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'user_material_progress'
            `);
            console.log('Structure:');
            console.table(progressStructure.recordset);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
