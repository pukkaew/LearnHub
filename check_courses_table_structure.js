const { poolPromise } = require('./config/database');

async function checkTableStructure() {
    try {
        console.log('🔍 Checking courses table structure...\n');

        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('📊 Columns in courses table:');
        console.log('─'.repeat(100));
        result.recordset.forEach(col => {
            const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
            const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE}${length.padEnd(15)} ${nullable}`);
        });

        console.log('\n✅ Check complete!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

checkTableStructure();
