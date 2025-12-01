const { poolPromise, sql } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Check if course_reviews table exists
        const tableCheck = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'course_reviews'
        `);
        console.log('=== course_reviews TABLE EXISTS ===');
        console.log(tableCheck.recordset[0].count > 0 ? 'Yes' : 'No');

        if (tableCheck.recordset[0].count > 0) {
            // Get table structure
            const structure = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'course_reviews'
                ORDER BY ORDINAL_POSITION
            `);
            console.log('\nTable Structure:');
            console.table(structure.recordset);

            // Check existing reviews
            const reviews = await pool.request().query(`
                SELECT TOP 5 * FROM course_reviews ORDER BY created_at DESC
            `);
            console.log('\nExisting reviews:', reviews.recordset.length);
            if (reviews.recordset.length > 0) {
                console.log(reviews.recordset);
            }
        } else {
            console.log('\nTable does not exist - needs to be created');
        }

        // Check current rating implementation in user_courses
        console.log('\n=== user_courses TABLE (current rating workaround) ===');
        const userCoursesStructure = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses'
            AND COLUMN_NAME IN ('grade', 'rating', 'review', 'feedback')
        `);
        console.log('Rating-related columns:');
        console.table(userCoursesStructure.recordset);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
})();
