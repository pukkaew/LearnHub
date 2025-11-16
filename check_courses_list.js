// Check why courses are not showing in the list
const { poolPromise, sql } = require('./config/database');

async function checkCoursesList() {
    try {
        const pool = await poolPromise;

        console.log('\n=== Checking Courses List Issue ===\n');

        // Check all courses
        console.log('1. All courses in database:');
        const allCourses = await pool.request()
            .query('SELECT course_id, title, status, created_at FROM courses ORDER BY course_id DESC');

        console.table(allCourses.recordset);

        // Check courses with Active/Published status
        console.log('\n2. Courses with Active or Published status:');
        const publishedCourses = await pool.request()
            .query(`SELECT course_id, title, status FROM courses WHERE status IN ('Active', 'Published')`);

        console.table(publishedCourses.recordset);
        console.log(`Total Active/Published courses: ${publishedCourses.recordset.length}`);

        // Check API filter query
        console.log('\n3. Testing the exact query used by /courses/api/list:');
        const apiResult = await pool.request()
            .input('offset', sql.Int, 0)
            .input('limit', sql.Int, 12)
            .query(`
                SELECT c.*,
                       CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                       (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count
                FROM courses c
                LEFT JOIN users u ON c.instructor_id = u.user_id
                WHERE c.status IN ('Active', 'Published')
                ORDER BY c.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        console.log(`API Query returned ${apiResult.recordset.length} courses`);
        if (apiResult.recordset.length > 0) {
            console.table(apiResult.recordset.map(c => ({
                course_id: c.course_id,
                title: c.title,
                status: c.status,
                instructor: c.instructor_name
            })));
        }

        console.log('\n=== Recommendation ===');
        if (allCourses.recordset.length > 0 && publishedCourses.recordset.length === 0) {
            console.log('⚠️  Problem: All courses have status "Draft"');
            console.log('💡 Solution: Update course status to "Published" or "Active"');
            console.log('\nRun this query:');
            console.log(`UPDATE courses SET status = 'Published' WHERE course_id = ${allCourses.recordset[0].course_id};`);
        }

        console.log('\n=== Test Complete ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

checkCoursesList();
