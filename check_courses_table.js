const { poolPromise } = require('./config/database');

async function checkTable() {
    try {
        const pool = await poolPromise;

        console.log('Checking Courses table structure...\n');

        // Check if table exists
        const tableExists = await pool.request().query(`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'Courses'
        `);

        if (tableExists.recordset[0].count === 0) {
            console.log('❌ Table Courses does NOT exist!');
            process.exit(0);
        }

        console.log('✅ Table Courses exists\n');

        // Get all columns
        const columns = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Courses'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('Table columns:');
        console.log('='.repeat(80));
        columns.recordset.forEach(col => {
            console.log(`${col.COLUMN_NAME.padEnd(30)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        console.log('='.repeat(80));

        // Get row count
        const count = await pool.request().query('SELECT COUNT(*) as count FROM Courses');
        console.log(`\nTotal records: ${count.recordset[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTable();
