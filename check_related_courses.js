const { poolPromise, sql } = require('./config/database');

async function checkRelatedCourses() {
    try {
        const pool = await poolPromise;
        const courseId = 1;

        console.log('\n🔍 Checking Related Courses for Course ID:', courseId);
        console.log('='.repeat(60));

        // Check if there's a related_courses table
        const tablesResult = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE '%related%' OR TABLE_NAME LIKE '%relation%'
        `);

        console.log('\n📋 Tables with "related" or "relation" in name:');
        if (tablesResult.recordset.length === 0) {
            console.log('   ⚠️  No related tables found');
        } else {
            tablesResult.recordset.forEach(row => {
                console.log(`   - ${row.TABLE_NAME}`);
            });
        }

        // Check courses table for related_courses column
        const columnsResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            AND COLUMN_NAME LIKE '%related%'
        `);

        console.log('\n📋 Columns with "related" in courses table:');
        if (columnsResult.recordset.length === 0) {
            console.log('   ⚠️  No related columns found');
        } else {
            columnsResult.recordset.forEach(row => {
                console.log(`   - ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
            });
        }

        // Check what the current course has
        const courseResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query('SELECT * FROM courses WHERE course_id = @courseId');

        if (courseResult.recordset.length > 0) {
            const course = courseResult.recordset[0];
            console.log('\n📊 Course Data:');
            console.log(`   Course ID: ${course.course_id}`);
            console.log(`   Title: ${course.title}`);
            console.log(`   Category ID: ${course.category_id}`);

            // Check if there's a related_courses field
            if (course.hasOwnProperty('related_courses')) {
                console.log(`   Related Courses Field: ${course.related_courses}`);
            } else {
                console.log('   ⚠️  No related_courses field in table');
            }
        }

        // Try to find other courses in the same category
        const sameCategoryResult = await pool.request()
            .input('courseId', sql.Int, courseId)
            .query(`
                SELECT c1.category_id, COUNT(*) as course_count
                FROM courses c1
                WHERE c1.category_id = (SELECT category_id FROM courses WHERE course_id = @courseId)
                GROUP BY c1.category_id
            `);

        if (sameCategoryResult.recordset.length > 0) {
            console.log('\n🔍 Same Category Analysis:');
            console.log(`   Category ID: ${sameCategoryResult.recordset[0].category_id}`);
            console.log(`   Total courses in category: ${sameCategoryResult.recordset[0].course_count}`);
        }

        // List all courses to see what might be shown as related
        const allCoursesResult = await pool.request().query(`
            SELECT course_id, title, category_id, status
            FROM courses
            ORDER BY course_id
        `);

        console.log('\n📚 All Courses in Database:');
        allCoursesResult.recordset.forEach(c => {
            console.log(`   [${c.course_id}] ${c.title} (Category: ${c.category_id}, Status: ${c.status})`);
        });

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkRelatedCourses();
