// Fix duplicate UserAnswers
const { poolPromise, sql } = require('./config/database');

async function fixDuplicates() {
    try {
        const pool = await poolPromise;

        // Delete duplicate UserAnswers (keep the first one for each test_question_id and attempt_id)
        const result = await pool.request()
            .query(`
                WITH CTE AS (
                    SELECT answer_id,
                           ROW_NUMBER() OVER (
                               PARTITION BY attempt_id, test_question_id
                               ORDER BY answered_at ASC
                           ) as rn
                    FROM UserAnswers
                )
                DELETE FROM CTE WHERE rn > 1
            `);

        console.log('Deleted duplicate records:', result.rowsAffected[0]);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixDuplicates();
