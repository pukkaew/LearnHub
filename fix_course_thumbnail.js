const { poolPromise, sql } = require('./config/database');

async function fixCourseThumbnail() {
    try {
        const pool = await poolPromise;

        console.log('\n🔧 Updating course 1 thumbnail to NULL...');

        await pool.request()
            .input('courseId', sql.Int, 1)
            .query('UPDATE courses SET thumbnail = NULL WHERE course_id = @courseId');

        console.log('✅ Course thumbnail updated to NULL');

        // Verify
        const result = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT course_id, title, thumbnail FROM courses WHERE course_id = @courseId');

        console.log('\n📊 Updated data:');
        console.log('Course ID:', result.recordset[0].course_id);
        console.log('Title:', result.recordset[0].title);
        console.log('Thumbnail:', result.recordset[0].thumbnail);
        console.log('\n✅ Now will show default image: /images/course-default.svg');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixCourseThumbnail();
