const { poolPromise } = require('./config/database');

async function checkColumns() {
    try {
        const pool = await poolPromise;

        console.log('\n=== ตรวจสอบ columns ในตาราง Users ===\n');

        const result = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Users'
            AND COLUMN_NAME IN ('branch_id', 'office_id', 'division_id', 'department_id')
            ORDER BY COLUMN_NAME
        `);

        if (result.recordset.length === 0) {
            console.log('❌ ไม่พบ columns branch_id, office_id, division_id, department_id ในตาราง Users');
            console.log('\nต้องเพิ่ม columns เหล่านี้เข้าไปในตาราง Users');
        } else {
            console.log('✅ พบ columns ดังนี้:\n');
            result.recordset.forEach(col => {
                console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE}`);
            });
        }

        console.log('\n=== ตรวจสอบ columns ทั้งหมดในตาราง Users ===\n');
        const allColumns = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Users'
            ORDER BY ORDINAL_POSITION
        `);

        allColumns.recordset.forEach(col => {
            console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}) - Nullable: ${col.IS_NULLABLE}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkColumns();
