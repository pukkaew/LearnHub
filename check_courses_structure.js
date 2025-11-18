const { poolPromise } = require('./config/database');

async function checkStructure() {
    try {
        const pool = await poolPromise;

        console.log('📊 ตรวจสอบโครงสร้างตาราง courses...\n');

        const result = await pool.request().query(`
            SELECT
                COLUMN_NAME as ชื่อColumn,
                DATA_TYPE as ประเภทข้อมูล,
                CHARACTER_MAXIMUM_LENGTH as ความยาว,
                IS_NULLABLE as อนุญาตNULL
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'courses'
            ORDER BY ORDINAL_POSITION
        `);

        console.table(result.recordset);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkStructure();
