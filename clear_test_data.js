/**
 * Script: Clear all test and applicant data
 * ลบข้อมูลข้อสอบ ผู้สมัครงาน และการทำข้อสอบทั้งหมด
 */

const { poolPromise, sql } = require('./config/database');

async function clearAllTestData() {
    try {
        const pool = await poolPromise;
        console.log('🗑️  Starting to clear test and applicant data...\n');

        // 1. ลบ ApplicantTestProgress
        console.log('1. Deleting ApplicantTestProgress...');
        let result = await pool.request().query('DELETE FROM ApplicantTestProgress');
        console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);

        // 2. ลบ PositionTestSetConfig
        console.log('2. Deleting PositionTestSetConfig...');
        result = await pool.request().query('DELETE FROM PositionTestSetConfig');
        console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);

        // 3. ลบ PositionTestSets
        console.log('3. Deleting PositionTestSets...');
        result = await pool.request().query('DELETE FROM PositionTestSets');
        console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);

        // 4. ลบ ApplicantTestAttempts (ถ้ามี)
        console.log('4. Deleting ApplicantTestAttempts...');
        try {
            result = await pool.request().query('DELETE FROM ApplicantTestAttempts');
            console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);
        } catch (e) {
            console.log('   - Table not found, skipping\n');
        }

        // 5. ลบ TestAttemptAnswers
        console.log('5. Deleting TestAttemptAnswers...');
        try {
            result = await pool.request().query('DELETE FROM TestAttemptAnswers');
            console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);
        } catch (e) {
            console.log('   - Table not found, skipping\n');
        }

        // 6. ลบ TestAttempts
        console.log('6. Deleting TestAttempts...');
        result = await pool.request().query('DELETE FROM TestAttempts');
        console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);

        // 7. ลบ Applicants
        console.log('7. Deleting Applicants...');
        result = await pool.request().query('DELETE FROM Applicants');
        console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);

        // 8. ลบ QuestionOptions (ถ้ามี)
        console.log('8. Deleting QuestionOptions...');
        try {
            result = await pool.request().query('DELETE FROM QuestionOptions');
            console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);
        } catch (e) {
            console.log('   - Table not found, skipping\n');
        }

        // 9. ลบ Questions
        console.log('9. Deleting Questions...');
        result = await pool.request().query('DELETE FROM Questions');
        console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);

        // 10. ลบ Tests
        console.log('10. Deleting Tests...');
        result = await pool.request().query('DELETE FROM Tests');
        console.log(`   ✓ Deleted ${result.rowsAffected[0]} rows\n`);

        // Reset Identity seeds
        console.log('11. Resetting identity seeds...');
        const tables = [
            'ApplicantTestProgress',
            'PositionTestSetConfig',
            'PositionTestSets',
            'TestAttempts',
            'Applicants',
            'Questions',
            'Tests'
        ];

        for (const table of tables) {
            try {
                await pool.request().query(`DBCC CHECKIDENT ('${table}', RESEED, 0)`);
                console.log(`   ✓ Reset ${table} identity`);
            } catch (e) {
                // Table might not have identity column
            }
        }

        console.log('\n✅ All test and applicant data cleared successfully!');

    } catch (error) {
        console.error('❌ Error clearing data:', error);
    } finally {
        process.exit(0);
    }
}

clearAllTestData();
