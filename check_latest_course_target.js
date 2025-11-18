const {poolPromise} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Get latest course
        const result = await pool.request().query(`
            SELECT TOP 1
                course_id,
                title,
                target_audience,
                created_at
            FROM courses
            ORDER BY course_id DESC
        `);

        if (result.recordset.length === 0) {
            console.log('❌ No courses found');
            process.exit(1);
        }

        const course = result.recordset[0];

        console.log('\n📚 Latest Course (ID: ' + course.course_id + '): ' + course.title);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('Created at:', course.created_at);
        console.log('\n📋 target_audience value:');
        console.log('  Type:', typeof course.target_audience);
        console.log('  Value:', course.target_audience);

        if (course.target_audience) {
            try {
                const parsed = JSON.parse(course.target_audience);
                console.log('\n✅ Parsed JSON:');
                console.log('  positions:', JSON.stringify(parsed.positions));
                console.log('  departments:', JSON.stringify(parsed.departments));
            } catch (e) {
                console.log('\n❌ Error parsing JSON:', e.message);
            }
        } else {
            console.log('\n⚠️  target_audience is NULL');
            console.log('  → Will display as: "เปิดกว้างสำหรับทุกคน"');
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
})();
