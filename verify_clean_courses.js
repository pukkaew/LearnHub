const { poolPromise } = require('./config/database');

async function verifyClean() {
    try {
        const pool = await poolPromise;

        console.log('🔍 Verifying course data is clean...\n');

        const tables = [
            'courses',
            'tests',
            'course_materials',
            'learning_objectives',
            'target_audience',
            'course_categories',
            'test_attempts',
            'test_questions',
            'course_enrollments'
        ];

        let allClean = true;

        for (const table of tables) {
            try {
                const result = await pool.request()
                    .query(`SELECT COUNT(*) as count FROM ${table}`);

                const count = result.recordset[0].count;

                if (count === 0) {
                    console.log(`✅ ${table.padEnd(25)} - Empty (${count} records)`);
                } else {
                    console.log(`⚠️  ${table.padEnd(25)} - NOT EMPTY (${count} records)`);
                    allClean = false;
                }
            } catch (err) {
                if (err.message.includes('Invalid object name')) {
                    console.log(`➖ ${table.padEnd(25)} - Table does not exist`);
                } else {
                    throw err;
                }
            }
        }

        console.log('\n' + '='.repeat(50));
        if (allClean) {
            console.log('✅ ALL DATA CLEANED SUCCESSFULLY!');
            console.log('🎉 Database is ready for fresh course data.');
        } else {
            console.log('⚠️  Some tables still have data!');
        }
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit();
    }
}

verifyClean();
