const { poolPromise } = require('./config/database');

async function checkTables() {
    try {
        const pool = await poolPromise;

        console.log('📊 Tests Table Structure:');
        const tests = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tests'
            ORDER BY ORDINAL_POSITION
        `);
        tests.recordset.forEach(c => {
            const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE}) ${nullable}`);
        });

        console.log('\n📊 User_Courses Table Structure:');
        const uc = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'user_courses'
            ORDER BY ORDINAL_POSITION
        `);
        uc.recordset.forEach(c => {
            const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE}) ${nullable}`);
        });

        console.log('\n📊 Test_Results Table Structure:');
        const tr = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'test_results'
            ORDER BY ORDINAL_POSITION
        `);
        tr.recordset.forEach(c => {
            const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
            console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE}) ${nullable}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTables();
