const { poolPromise } = require('./config/database.js');

async function cleanData() {
    try {
        const pool = await poolPromise;

        // Clean ApplicantTestAttempts
        const result1 = await pool.request().query('DELETE FROM ApplicantTestAttempts');
        console.log('ApplicantTestAttempts:', result1.rowsAffected[0], 'rows deleted');

        // Reset ApplicantTestProgress
        const result3 = await pool.request().query("UPDATE ApplicantTestProgress SET status = 'pending', attempt_id = NULL, score = NULL, percentage = NULL, passed = NULL, started_at = NULL, completed_at = NULL, time_spent_seconds = NULL");
        console.log('ApplicantTestProgress: reset', result3.rowsAffected[0], 'rows');

        // Reset Applicant status to Pending
        const result4 = await pool.request().query("UPDATE Applicants SET status = 'Pending'");
        console.log('Applicants: reset status', result4.rowsAffected[0], 'rows');

        console.log('\nClean completed!');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

cleanData();
