const { poolPromise, sql } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Check course 1 certificate settings
        const course = await pool.request()
            .input('courseId', sql.Int, 1)
            .query(`
                SELECT course_id, title, certificate_template, certificate_validity
                FROM courses
                WHERE course_id = @courseId
            `);

        console.log('=== COURSE 1 CERTIFICATE SETTINGS ===');
        if (course.recordset.length > 0) {
            const c = course.recordset[0];
            console.log('Course:', c.title);
            console.log('certificate_template:', c.certificate_template || '(not set)');
            console.log('certificate_validity:', c.certificate_validity || '(not set)');
            console.log('\nShould show certificate button:',
                (c.certificate_template || c.certificate_validity) ? 'YES' : 'NO');
        }

        // Check enrollment status for admin user
        const enrollment = await pool.request()
            .input('courseId', sql.Int, 1)
            .input('userId', sql.Int, 1)
            .query(`
                SELECT status, progress, completion_date
                FROM user_courses
                WHERE course_id = @courseId AND user_id = @userId
            `);

        console.log('\n=== ADMIN ENROLLMENT STATUS ===');
        if (enrollment.recordset.length > 0) {
            const e = enrollment.recordset[0];
            console.log('Status:', e.status);
            console.log('Progress:', e.progress);
            console.log('Completion Date:', e.completion_date);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
