const { poolPromise } = require('./config/database');

async function checkTestsSchema() {
    try {
        const pool = await poolPromise;

        // Get columns of tests table
        const columns = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tests'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 โครงสร้างตาราง tests:\n');
        columns.recordset.forEach(col => {
            console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Count tests
        const count = await pool.request().query('SELECT COUNT(*) as total FROM tests');
        console.log(`\n📊 จำนวน tests: ${count.recordset[0].total} รายการ\n`);

        // Get tests
        const result = await pool.request().query(`
            SELECT TOP 5 *
            FROM tests
            ORDER BY test_id
        `);

        if (result.recordset.length > 0) {
            console.log('📋 Tests ตัวอย่าง:\n');
            result.recordset.forEach(test => {
                console.log(`   ID: ${test.test_id}, Course: ${test.course_id || 'NULL'}`);
            });
        }

        console.log('\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTestsSchema();
