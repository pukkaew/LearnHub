/**
 * ลบข้อมูลข้อสอบ, ผู้สมัครงาน, และการทำข้อสอบทั้งหมด
 */

const { poolPromise } = require('./config/database');

async function clearAllTestData() {
    try {
        const pool = await poolPromise;
        console.log('Connected to database\n');

        console.log('=== Deleting All Test Data ===\n');

        // 1. ลบ ApplicantTestProgress
        let result = await pool.request().query(`DELETE FROM ApplicantTestProgress`);
        console.log(`1. ApplicantTestProgress: ${result.rowsAffected[0]} rows deleted`);

        // 2. ลบ ApplicantTestAttempts
        result = await pool.request().query(`
            IF EXISTS (SELECT * FROM sysobjects WHERE name='ApplicantTestAttempts' AND xtype='U')
            DELETE FROM ApplicantTestAttempts
        `);
        console.log(`2. ApplicantTestAttempts: ${result.rowsAffected[0] || 0} rows deleted`);

        // 3. ลบ TestAttemptAnswers
        result = await pool.request().query(`
            IF EXISTS (SELECT * FROM sysobjects WHERE name='TestAttemptAnswers' AND xtype='U')
            DELETE FROM TestAttemptAnswers
        `);
        console.log(`3. TestAttemptAnswers: ${result.rowsAffected[0] || 0} rows deleted`);

        // 4. ลบ TestAttempts
        result = await pool.request().query(`
            IF EXISTS (SELECT * FROM sysobjects WHERE name='TestAttempts' AND xtype='U')
            DELETE FROM TestAttempts
        `);
        console.log(`4. TestAttempts: ${result.rowsAffected[0] || 0} rows deleted`);

        // 5. ลบ PositionTestSetConfig
        result = await pool.request().query(`DELETE FROM PositionTestSetConfig`);
        console.log(`5. PositionTestSetConfig: ${result.rowsAffected[0]} rows deleted`);

        // 6. ลบ PositionTestSets
        result = await pool.request().query(`DELETE FROM PositionTestSets`);
        console.log(`6. PositionTestSets: ${result.rowsAffected[0]} rows deleted`);

        // 7. ลบ Applicants
        result = await pool.request().query(`DELETE FROM Applicants`);
        console.log(`7. Applicants: ${result.rowsAffected[0]} rows deleted`);

        // 8. ลบ QuestionOptions
        result = await pool.request().query(`
            IF EXISTS (SELECT * FROM sysobjects WHERE name='QuestionOptions' AND xtype='U')
            DELETE FROM QuestionOptions
        `);
        console.log(`8. QuestionOptions: ${result.rowsAffected[0] || 0} rows deleted`);

        // 9. ลบ Questions
        result = await pool.request().query(`DELETE FROM Questions`);
        console.log(`9. Questions: ${result.rowsAffected[0]} rows deleted`);

        // 10. ลบ Tests
        result = await pool.request().query(`DELETE FROM Tests`);
        console.log(`10. Tests: ${result.rowsAffected[0]} rows deleted`);

        console.log('\n=== All Test Data Cleared Successfully! ===');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

clearAllTestData();
