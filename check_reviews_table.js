const { poolPromise } = require('./config/database');

async function checkReviewsTable() {
    try {
        const pool = await poolPromise;

        // Check if course_reviews table exists
        const result = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME LIKE '%review%'
        `);

        console.log('Tables with "review" in name:', result.recordset);

        // Also check all tables for reference
        const allTables = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `);

        console.log('\nAll tables in database:');
        allTables.recordset.forEach(t => console.log('  -', t.TABLE_NAME));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkReviewsTable();
