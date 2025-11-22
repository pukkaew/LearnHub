const { poolPromise } = require('./config/database');

async function checkTestsTable() {
    try {
        const pool = await poolPromise;

        const result = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'tests'
            ORDER BY ORDINAL_POSITION
        `);

        console.log('\n📋 Tests Table Structure:\n');
        console.log('Column Name'.padEnd(35) + 'Data Type'.padEnd(20) + 'Nullable'.padEnd(10) + 'Max Length');
        console.log('-'.repeat(80));

        result.recordset.forEach(col => {
            const name = col.COLUMN_NAME.padEnd(35);
            const type = col.DATA_TYPE.padEnd(20);
            const nullable = col.IS_NULLABLE.padEnd(10);
            const maxLen = col.CHARACTER_MAXIMUM_LENGTH || '-';
            console.log(`${name}${type}${nullable}${maxLen}`);
        });

        console.log('\n✅ Total columns:', result.recordset.length);

        // Check for new columns
        const columnNames = result.recordset.map(c => c.COLUMN_NAME);
        const requiredColumns = ['is_graded', 'is_required', 'is_passing_required', 'score_weight', 'show_score_breakdown'];

        console.log('\n🔍 Checking for new columns:');
        requiredColumns.forEach(col => {
            if (columnNames.includes(col)) {
                console.log(`  ✅ ${col} exists`);
            } else {
                console.log(`  ❌ ${col} MISSING`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

checkTestsTable();
