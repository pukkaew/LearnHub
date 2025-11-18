const {poolPromise} = require('./config/database');

async function checkTable() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'course_materials'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 course_materials table columns:\n');
        result.recordset.forEach(c => {
            const length = c.CHARACTER_MAXIMUM_LENGTH ? `(${c.CHARACTER_MAXIMUM_LENGTH})` : '';
            console.log(`  ${c.COLUMN_NAME.padEnd(30)} ${c.DATA_TYPE}${length.padEnd(15)} Nullable: ${c.IS_NULLABLE}`);
        });
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTable();
