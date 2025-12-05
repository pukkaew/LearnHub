const { poolPromise } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Check TestQuestions schema
        const schema = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'TestQuestions'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('TestQuestions columns:');
        schema.recordset.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        // Check data for test_id=3
        const data = await pool.request().query(`
            SELECT TOP 10 * FROM TestQuestions WHERE test_id = 3
        `);
        console.log('\nTestQuestions for test_id=3:');
        console.log(JSON.stringify(data.recordset, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
