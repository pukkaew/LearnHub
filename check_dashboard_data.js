const { poolPromise } = require('./config/database');

async function checkDashboardData() {
    try {
        const pool = await poolPromise;

        console.log('=== Checking Dashboard Data ===\n');

        // Check user_courses table structure
        console.log('1. user_courses Table Structure:');
        const ucColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses'
        `);
        console.table(ucColumns.recordset);

        // Check user_courses data
        console.log('\n2. User Courses (Learning Progress):');
        const userCourses = await pool.request().query(`
            SELECT TOP 10 * FROM user_courses
        `);
        console.log('Total records:', userCourses.recordset.length);
        if (userCourses.recordset.length > 0) {
            console.log(userCourses.recordset);
        } else {
            console.log('   No enrolled courses found');
        }

        // Check articles table structure
        console.log('\n3. articles Table Structure:');
        const artColumns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'articles'
        `);
        if (artColumns.recordset.length > 0) {
            console.table(artColumns.recordset);
        } else {
            console.log('   articles table does not exist');
        }

        // Check articles data
        console.log('\n4. Articles (Recent Articles):');
        try {
            const articles = await pool.request().query(`
                SELECT TOP 10 * FROM articles
            `);
            console.log('Total records:', articles.recordset.length);
            if (articles.recordset.length > 0) {
                console.log(articles.recordset);
            } else {
                console.log('   No articles found');
            }
        } catch (e) {
            console.log('   Error: articles table may not exist -', e.message);
        }

        // Check available courses
        console.log('\n5. Available Courses:');
        const courses = await pool.request().query(`
            SELECT TOP 5
                course_id,
                title,
                status,
                is_active
            FROM courses
        `);
        console.log('Total courses:', courses.recordset.length);
        if (courses.recordset.length > 0) {
            console.log(courses.recordset);
        }

        console.log('\n=== Done ===');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkDashboardData();
