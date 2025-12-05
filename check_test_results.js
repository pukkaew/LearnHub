const { poolPromise, sql } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;
        const attemptId = 1;
        const testId = 3;

        console.log('=== Checking Test Results for attempt_id=1 ===\n');

        // Check attempt exists
        const attemptResult = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                SELECT ta.*,
                       t.title as test_title,
                       t.passing_marks as passing_score,
                       t.total_marks,
                       t.show_results,
                       t.attempts_allowed,
                       DATEDIFF(MINUTE, ta.started_at, ISNULL(ta.completed_at, GETDATE())) as time_taken
                FROM TestAttempts ta
                JOIN tests t ON ta.test_id = t.test_id
                WHERE ta.attempt_id = @attemptId
            `);

        if (attemptResult.recordset.length === 0) {
            console.log('ERROR: Attempt not found!');

            // Check if any attempts exist
            const allAttempts = await pool.request().query(`
                SELECT attempt_id, test_id, user_id, status, percentage, started_at, completed_at
                FROM TestAttempts ORDER BY attempt_id
            `);
            console.log('\nAll TestAttempts:');
            console.log(JSON.stringify(allAttempts.recordset, null, 2));
            process.exit(1);
        }

        const attempt = attemptResult.recordset[0];
        console.log('Attempt found:');
        console.log('  - attempt_id:', attempt.attempt_id);
        console.log('  - test_id:', attempt.test_id);
        console.log('  - test_title:', attempt.test_title);
        console.log('  - status:', attempt.status);
        console.log('  - percentage:', attempt.percentage);
        console.log('  - passing_score:', attempt.passing_score);
        console.log('  - time_taken:', attempt.time_taken, 'minutes');
        console.log('  - show_results:', attempt.show_results);

        // Check questions for this test
        const questionsResult = await pool.request()
            .input('testId', sql.Int, attempt.test_id)
            .query(`
                SELECT question_id, question_type, question_text, points, difficulty_level
                FROM Questions
                WHERE test_id = @testId AND is_active = 1
                ORDER BY question_id
            `);

        console.log('\nQuestions in test:', questionsResult.recordset.length);
        questionsResult.recordset.forEach((q, i) => {
            console.log(`  ${i+1}. [${q.question_type}] ${q.question_text.substring(0, 50)}... (${q.points} pts)`);
        });

        // Check TestAnswers for this attempt
        const answersResult = await pool.request()
            .input('attemptId', sql.Int, attemptId)
            .query(`
                SELECT ta.*, q.question_text
                FROM TestAnswers ta
                JOIN Questions q ON ta.question_id = q.question_id
                WHERE ta.attempt_id = @attemptId
            `);

        console.log('\nTestAnswers for this attempt:', answersResult.recordset.length);
        answersResult.recordset.forEach((a, i) => {
            console.log(`  ${i+1}. question_id=${a.question_id}, user_answer=${a.user_answer}, is_correct=${a.is_correct}, points_earned=${a.points_earned}`);
        });

        // Check QuestionOptions for multiple choice questions
        console.log('\n=== Question Options ===');
        for (const q of questionsResult.recordset) {
            if (q.question_type === 'multiple_choice') {
                const options = await pool.request()
                    .input('questionId', sql.Int, q.question_id)
                    .query(`
                        SELECT option_id, option_text, is_correct, option_order
                        FROM QuestionOptions
                        WHERE question_id = @questionId
                        ORDER BY option_order
                    `);
                console.log(`\nQuestion ${q.question_id} options:`);
                options.recordset.forEach(o => {
                    console.log(`  - option_id=${o.option_id}: ${o.option_text} ${o.is_correct ? '(CORRECT)' : ''}`);
                });
            }
        }

        console.log('\n=== Test Complete ===');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
