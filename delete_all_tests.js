/**
 * Script to delete all test data from the database
 * Deletes in correct order respecting foreign key constraints
 */

const { poolPromise, sql } = require('./config/database');

async function deleteAllTests() {
    const pool = await poolPromise;
    const transaction = pool.transaction();

    try {
        await transaction.begin();
        console.log('Starting deletion of all test data...\n');

        // 1. Delete UserAnswers (references TestQuestions via test_question_id)
        let result = await transaction.request().query('DELETE FROM UserAnswers');
        console.log(`1. Deleted ${result.rowsAffected[0]} rows from UserAnswers`);

        // 2. Delete TestAttempts (references Tests)
        result = await transaction.request().query('DELETE FROM TestAttempts');
        console.log(`2. Deleted ${result.rowsAffected[0]} rows from TestAttempts`);

        // 3. Delete ApplicantTestResults (references Tests and Applicants)
        result = await transaction.request().query('DELETE FROM ApplicantTestResults');
        console.log(`3. Deleted ${result.rowsAffected[0]} rows from ApplicantTestResults`);

        // 4. Delete ApplicantTestAttempts (references Tests and Applicants)
        result = await transaction.request().query('DELETE FROM ApplicantTestAttempts');
        console.log(`4. Deleted ${result.rowsAffected[0]} rows from ApplicantTestAttempts`);

        // 5. Delete ApplicantTestAssignments (references Tests and Applicants)
        result = await transaction.request().query('DELETE FROM ApplicantTestAssignments');
        console.log(`5. Deleted ${result.rowsAffected[0]} rows from ApplicantTestAssignments`);

        // 5.5 Delete ApplicantTestProgress (references Tests)
        result = await transaction.request().query('DELETE FROM ApplicantTestProgress');
        console.log(`5.5. Deleted ${result.rowsAffected[0]} rows from ApplicantTestProgress`);

        // 6. Delete PositionTestSets (references Tests and Positions)
        result = await transaction.request().query('DELETE FROM PositionTestSets');
        console.log(`6. Deleted ${result.rowsAffected[0]} rows from PositionTestSets`);

        // 7. Delete PositionTestSetConfig (references Positions)
        result = await transaction.request().query('DELETE FROM PositionTestSetConfig');
        console.log(`7. Deleted ${result.rowsAffected[0]} rows from PositionTestSetConfig`);

        // 8. Delete TestPositions (references Tests and Positions)
        result = await transaction.request().query('DELETE FROM TestPositions');
        console.log(`8. Deleted ${result.rowsAffected[0]} rows from TestPositions`);

        // 9. Delete TestQuestions (references Tests and Questions)
        result = await transaction.request().query('DELETE FROM TestQuestions');
        console.log(`9. Deleted ${result.rowsAffected[0]} rows from TestQuestions`);

        // 10. Delete QuestionOptions (references Questions)
        result = await transaction.request().query('DELETE FROM QuestionOptions');
        console.log(`10. Deleted ${result.rowsAffected[0]} rows from QuestionOptions`);

        // 11. Delete Questions (references Tests)
        result = await transaction.request().query('DELETE FROM Questions');
        console.log(`11. Deleted ${result.rowsAffected[0]} rows from Questions`);

        // 12. Finally, Delete Tests
        result = await transaction.request().query('DELETE FROM Tests');
        console.log(`12. Deleted ${result.rowsAffected[0]} rows from Tests`);

        await transaction.commit();
        console.log('\n✅ All test data deleted successfully!');

    } catch (error) {
        await transaction.rollback();
        console.error('\n❌ Error deleting test data:', error.message);

        // If a table doesn't exist, try without it
        if (error.message.includes('Invalid object name')) {
            console.log('\nSome tables may not exist. Trying alternative deletion...');
            await deleteWithoutMissingTables(pool);
        }
    } finally {
        process.exit(0);
    }
}

async function deleteWithoutMissingTables(pool) {
    const tables = [
        'UserAnswers',
        'TestAttempts',
        'ApplicantTestResults',
        'ApplicantTestAttempts',
        'ApplicantTestAssignments',
        'ApplicantTestProgress',
        'PositionTestSets',
        'PositionTestSetConfig',
        'TestPositions',
        'TestQuestions',
        'QuestionOptions',
        'Questions',
        'Tests'
    ];

    console.log('\nAttempting to delete from each table individually...\n');

    for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        try {
            const result = await pool.request().query(`DELETE FROM ${table}`);
            console.log(`${i + 1}. Deleted ${result.rowsAffected[0]} rows from ${table}`);
        } catch (error) {
            if (error.message.includes('Invalid object name')) {
                console.log(`${i + 1}. Skipped ${table} (table does not exist)`);
            } else if (error.message.includes('REFERENCE constraint')) {
                console.log(`${i + 1}. Skipped ${table} (foreign key constraint - will try later)`);
            } else {
                console.log(`${i + 1}. Error on ${table}: ${error.message}`);
            }
        }
    }

    console.log('\n✅ Deletion attempt completed!');
}

deleteAllTests();
