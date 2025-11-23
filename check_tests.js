const { poolPromise } = require('./config/database');

async function checkTests() {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT test_id, test_name, course_id, created_at
            FROM tests
            ORDER BY test_id
        `);

        console.log(`\n📋 Tests ในฐานข้อมูล: ${result.recordset.length} รายการ\n`);

        result.recordset.forEach(test => {
            console.log(`   ID: ${test.test_id}, Name: ${test.test_name}, Course: ${test.course_id || 'NULL'}`);
        });

        console.log('\n');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTests();
