const { poolPromise } = require('./config/database');

async function check() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'QuestionOptions'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('Columns in QuestionOptions table:');
        result.recordset.forEach(r => console.log(' -', r.COLUMN_NAME));
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

check();
