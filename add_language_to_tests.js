// Migration script to add language column to tests table
const { poolPromise, sql } = require('./config/database');

async function addLanguageColumn() {
    try {
        const pool = await poolPromise;

        // Check if column already exists
        const checkResult = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tests' AND COLUMN_NAME = 'language'
        `);

        if (checkResult.recordset.length > 0) {
            console.log('Column "language" already exists in tests table');
            process.exit(0);
        }

        // Add the column
        await pool.request().query(`
            ALTER TABLE tests
            ADD language NVARCHAR(10) DEFAULT 'th'
        `);

        console.log('Successfully added "language" column to tests table');
        process.exit(0);
    } catch (error) {
        console.error('Error adding language column:', error);
        process.exit(1);
    }
}

addLanguageColumn();
