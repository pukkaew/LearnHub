const { poolPromise, sql } = require('./config/database');

async function checkCoursesInDatabase() {
    try {
        console.log('🔍 Checking courses in database...\n');

        const pool = await poolPromise;

        // Check total courses
        const countResult = await pool.request().query(`
            SELECT COUNT(*) as total FROM courses
        `);
        console.log(`📊 Total courses in database: ${countResult.recordset[0].total}`);

        // Check courses by status
        const statusResult = await pool.request().query(`
            SELECT status, COUNT(*) as count
            FROM courses
            GROUP BY status
            ORDER BY count DESC
        `);
        console.log('\n📈 Courses by status:');
        statusResult.recordset.forEach(row => {
            console.log(`   ${row.status || 'NULL'}: ${row.count}`);
        });

        // Get sample courses with the query used by Course.findAll
        const sampleResult = await pool.request()
            .input('offset', sql.Int, 0)
            .input('limit', sql.Int, 5)
            .query(`
                SELECT c.*,
                       c.category as category_name,
                       CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
                       (SELECT COUNT(*) FROM user_courses WHERE course_id = c.course_id) as enrolled_count
                FROM courses c
                LEFT JOIN users u ON c.instructor_id = u.user_id
                WHERE c.status IN ('Active', 'Published')
                ORDER BY c.created_at DESC
                OFFSET @offset ROWS
                FETCH NEXT @limit ROWS ONLY
            `);

        console.log(`\n📚 Sample courses (Active/Published): ${sampleResult.recordset.length}`);

        if (sampleResult.recordset.length > 0) {
            console.log('\n🔍 First course details:');
            const course = sampleResult.recordset[0];
            console.log(JSON.stringify(course, null, 2));

            console.log('\n📋 Fields available in course object:');
            console.log(Object.keys(course));
        } else {
            console.log('\n⚠️ No Active/Published courses found!');

            // Check if there are any courses at all
            const allCoursesResult = await pool.request()
                .input('limit', sql.Int, 5)
                .query(`
                    SELECT TOP (@limit) c.*,
                           c.category as category_name,
                           CONCAT(u.first_name, ' ', u.last_name) as instructor_name
                    FROM courses c
                    LEFT JOIN users u ON c.instructor_id = u.user_id
                    ORDER BY c.created_at DESC
                `);

            console.log(`\n📚 All courses (any status): ${allCoursesResult.recordset.length}`);
            if (allCoursesResult.recordset.length > 0) {
                console.log('\n🔍 First course (any status):');
                const course = allCoursesResult.recordset[0];
                console.log('Course ID:', course.course_id);
                console.log('Title:', course.title);
                console.log('Status:', course.status);
                console.log('Category:', course.category);
                console.log('Instructor:', course.instructor_name);
            }
        }

        // Check course categories
        const categoriesResult = await pool.request().query(`
            SELECT category_name, COUNT(*) as count
            FROM CourseCategories
            WHERE is_active = 1
            GROUP BY category_name
            ORDER BY count DESC
        `);
        console.log('\n📂 Active categories:');
        categoriesResult.recordset.forEach(row => {
            console.log(`   ${row.category_name}: ${row.count} categories`);
        });

        console.log('\n✅ Database check complete!');

    } catch (error) {
        console.error('\n❌ Error checking database:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit();
    }
}

checkCoursesInDatabase();
