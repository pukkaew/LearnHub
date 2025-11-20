const { poolPromise, sql } = require('./config/database');

async function checkCourseThumbnail() {
    try {
        const pool = await poolPromise;

        const result = await pool.request()
            .input('courseId', sql.Int, 1)
            .query('SELECT course_id, title, thumbnail FROM courses WHERE course_id = @courseId');

        if (result.recordset.length === 0) {
            console.log('❌ No course found with ID 1');
            return;
        }

        const course = result.recordset[0];

        console.log('\n📊 Course Thumbnail Data:');
        console.log('=====================================');
        console.log('Course ID:', course.course_id);
        console.log('Title:', course.title);
        console.log('Thumbnail value:', course.thumbnail);
        console.log('Thumbnail type:', typeof course.thumbnail);
        console.log('Thumbnail is null:', course.thumbnail === null);
        console.log('Thumbnail is undefined:', course.thumbnail === undefined);
        console.log('Thumbnail is empty string:', course.thumbnail === '');

        console.log('\n🔍 What should happen:');
        if (!course.thumbnail || course.thumbnail === null || course.thumbnail === '') {
            console.log('✅ Should show default image: /images/course-default.svg');
        } else {
            console.log('ℹ️  Should show:', course.thumbnail);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkCourseThumbnail();
