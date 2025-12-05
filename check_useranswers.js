const { poolPromise } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Check UserAnswers schema
        const schema = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'UserAnswers'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('UserAnswers columns:');
        schema.recordset.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        // Check data
        const data = await pool.request().query(`
            SELECT TOP 5 * FROM UserAnswers
        `);
        console.log('\nSample data:');
        console.log(JSON.stringify(data.recordset, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
