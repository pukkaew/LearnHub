const { poolPromise } = require('./config/database');

async function checkLatestCourse() {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT TOP 1
                course_id,
                title,
                duration_hours,
                target_audience,
                course_type,
                created_at
            FROM Courses
            ORDER BY course_id DESC
        `);

        if (result.recordset.length > 0) {
            const course = result.recordset[0];
            console.log('\n✅ ล่าสุดคอร์ส:');
            console.log(`   Course ID: ${course.course_id}`);
            console.log(`   Title: ${course.title}`);
            console.log(`   Duration: ${course.duration_hours} hours`);
            console.log(`   Type: ${course.course_type}`);
            console.log(`   Target Audience: ${course.target_audience ? 'Yes' : 'No'}`);
            console.log(`   Created: ${course.created_at}`);
        } else {
            console.log('❌ ไม่พบคอร์ส');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkLatestCourse();
