const { poolPromise } = require('./config/database.js');

async function cleanAllData() {
    try {
        const pool = await poolPromise;

        console.log('Starting comprehensive data cleanup...\n');

        // 1. Clean ApplicantTestAttempts
        const r1 = await pool.request().query('DELETE FROM ApplicantTestAttempts');
        console.log('ApplicantTestAttempts:', r1.rowsAffected[0], 'rows deleted');

        // 2. Clean ApplicantTestProgress
        const r2 = await pool.request().query('DELETE FROM ApplicantTestProgress');
        console.log('ApplicantTestProgress:', r2.rowsAffected[0], 'rows deleted');

        // 3. Clean TestAttempts
        const r3 = await pool.request().query('DELETE FROM TestAttempts');
        console.log('TestAttempts:', r3.rowsAffected[0], 'rows deleted');

        // 4. Clean Applicants (job applications)
        const r4 = await pool.request().query('DELETE FROM Applicants');
        console.log('Applicants:', r4.rowsAffected[0], 'rows deleted');

        // 5. Clean TestPositions (test-position assignments)
        const r5 = await pool.request().query('DELETE FROM TestPositions');
        console.log('TestPositions:', r5.rowsAffected[0], 'rows deleted');

        // 6. Clean Questions (test questions)
        const r6 = await pool.request().query('DELETE FROM Questions');
        console.log('Questions:', r6.rowsAffected[0], 'rows deleted');

        // 7. Clean Tests
        const r7 = await pool.request().query('DELETE FROM Tests');
        console.log('Tests:', r7.rowsAffected[0], 'rows deleted');

        console.log('\n=== All data cleaned successfully! ===');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

cleanAllData();
