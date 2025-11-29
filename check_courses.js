const { sql, poolPromise } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Get all courses
        const courses = await pool.query`
            SELECT
                course_id,
                course_name,
                course_code,
                status,
                created_at,
                instructor_id
            FROM courses
            ORDER BY created_at DESC
        `;

        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║          COURSES DATABASE - CURRENT DATA                 ║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');

        console.log(`Total Courses: ${courses.recordset.length}\n`);

        if (courses.recordset.length === 0) {
            console.log('✅ Database is clean - No courses found');
        } else {
            console.log('=== COURSES LIST ===\n');
            courses.recordset.forEach((c, i) => {
                const date = c.created_at ? c.created_at.toISOString().split('T')[0] : 'N/A';
                console.log(`${i+1}. [ID: ${c.course_id}] ${c.course_name}`);
                console.log(`   Code: ${c.course_code || 'N/A'}`);
                console.log(`   Status: ${c.status}`);
                console.log(`   Instructor ID: ${c.instructor_id || 'N/A'}`);
                console.log(`   Created: ${date}`);
                console.log('');
            });
        }

        // Check related data
        const enrollments = await pool.query`SELECT COUNT(*) as count FROM course_enrollments`;
        const lessons = await pool.query`SELECT COUNT(*) as count FROM lessons`;
        const chapters = await pool.query`SELECT COUNT(*) as count FROM chapters`;

        console.log('\n=== RELATED DATA ===');
        console.log(`Enrollments: ${enrollments.recordset[0].count}`);
        console.log(`Chapters: ${chapters.recordset[0].count}`);
        console.log(`Lessons: ${lessons.recordset[0].count}`);

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
