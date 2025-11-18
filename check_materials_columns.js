const {poolPromise, sql} = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'course_materials'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\ncourse_materials columns:');
        result.recordset.forEach(col => {
            const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
            console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length}`);
        });

        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
