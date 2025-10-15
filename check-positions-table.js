const { poolPromise } = require('./config/database');

async function checkPositionsTable() {
    try {
        const pool = await poolPromise;

        // ตรวจสอบโครงสร้างตาราง Positions
        const result = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                CHARACTER_MAXIMUM_LENGTH,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Positions'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 โครงสร้างตาราง Positions:\n');
        console.log('Column Name'.padEnd(30) + 'Data Type'.padEnd(20) + 'Nullable'.padEnd(12) + 'Max Length');
        console.log('-'.repeat(80));

        result.recordset.forEach(col => {
            console.log(
                col.COLUMN_NAME.padEnd(30) +
                col.DATA_TYPE.padEnd(20) +
                col.IS_NULLABLE.padEnd(12) +
                (col.CHARACTER_MAXIMUM_LENGTH || '-')
            );
        });

        console.log('\n✅ เสร็จสิ้น');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkPositionsTable();
