// Test script to check what data is returned for course ID 7
const { poolPromise, sql } = require('./config/database');

async function testCourseData() {
    try {
        const pool = await poolPromise;
        const courseId = 7;

        console.log('\n=== Testing Course Data for course_id =', courseId, '===\n');

        // Test 1: Get raw course data
        console.log('1. Raw course data from courses table:');
        const rawResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query('SELECT * FROM courses WHERE course_id = @courseId');

        console.log(JSON.stringify(rawResult.recordset[0], null, 2));

        // Test 2: Get course with instructor info (as Course.findById should do)
        console.log('\n2. Course with instructor JOIN:');
        const courseWithInstructor = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`
                SELECT
                    c.*,
                    CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                    u.email as instructor_email,
                    COUNT(DISTINCT uc.enrollment_id) as enrolled_count
                FROM courses c
                LEFT JOIN users u ON c.instructor_id = u.user_id
                LEFT JOIN user_courses uc ON c.course_id = uc.course_id
                    AND uc.status IN ('active', 'pending', 'completed')
                WHERE c.course_id = @courseId
                GROUP BY
                    c.course_id, c.title, c.description, c.category, c.difficulty_level,
                    c.instructor_id, c.thumbnail, c.duration_hours, c.price, c.is_free,
                    c.status, c.enrollment_limit, c.start_date, c.end_date, c.test_id,
                    c.created_at, c.updated_at,
                    u.first_name, u.last_name, u.email
            `);

        console.log(JSON.stringify(courseWithInstructor.recordset[0], null, 2));

        // Test 3: Check category
        console.log('\n3. Category information:');
        const categoryResult = await pool.request()
            .input('category', sql.NVarChar(100), courseWithInstructor.recordset[0].category)
            .query('SELECT * FROM CourseCategories WHERE category_name = @category');

        console.log('Category from CourseCategories:', JSON.stringify(categoryResult.recordset[0], null, 2));

        console.log('\n=== Test Complete ===\n');
        process.exit(0);
    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testCourseData();
