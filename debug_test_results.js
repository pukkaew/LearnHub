const { poolPromise } = require('./config/database');

async function debugTestResults() {
    try {
        const pool = await poolPromise;
        const attemptId = 3;
        const testId = 2;

        console.log('=== Debug Test Results for attempt_id=3, test_id=2 ===\n');

        // 1. Check TestAttempts
        console.log('1. TestAttempts:');
        const attempt = await pool.request()
            .input('attemptId', attemptId)
            .query('SELECT * FROM TestAttempts WHERE attempt_id = @attemptId');
        console.log(attempt.recordset[0] || 'No attempt found');
        console.log('');

        // 2. Check Test info
        console.log('2. Test Info:');
        const test = await pool.request()
            .input('testId', testId)
            .query('SELECT test_id, title, total_marks, passing_marks, time_limit FROM Tests WHERE test_id = @testId');
        console.log(test.recordset[0] || 'No test found');
        console.log('');

        // 3. Check Questions in this test
        console.log('3. Questions in Test:');
        const questions = await pool.request()
            .input('testId', testId)
            .query('SELECT question_id, question_text, points FROM Questions WHERE test_id = @testId AND is_active = 1');
        console.log(`Found ${questions.recordset.length} questions`);
        questions.recordset.forEach((q, i) => {
            console.log(`  ${i+1}. Q${q.question_id}: ${q.question_text.substring(0, 50)}... (${q.points} pts)`);
        });
        console.log('');

        // 4. Check TestQuestions (mapping table)
        console.log('4. TestQuestions mapping:');
        const testQuestions = await pool.request()
            .input('testId', testId)
            .query('SELECT * FROM TestQuestions WHERE test_id = @testId ORDER BY question_order');
        console.log(`Found ${testQuestions.recordset.length} entries`);
        testQuestions.recordset.forEach((tq, i) => {
            console.log(`  ${i+1}. test_question_id=${tq.test_question_id}, question_id=${tq.question_id}`);
        });
        console.log('');

        // 5. Check UserAnswers for this attempt
        console.log('5. UserAnswers for attempt:');
        const answers = await pool.request()
            .input('attemptId', attemptId)
            .query('SELECT * FROM UserAnswers WHERE attempt_id = @attemptId');
        console.log(`Found ${answers.recordset.length} answers`);
        answers.recordset.forEach((a, i) => {
            console.log(`  ${i+1}. test_question_id=${a.test_question_id}, selected_option_id=${a.selected_option_id}, answer_text=${a.answer_text}, is_correct=${a.is_correct}`);
        });
        console.log('');

        // 6. The actual query from getAttemptResults
        console.log('6. Full join query result:');
        const fullResult = await pool.request()
            .input('attemptId', attemptId)
            .input('testId', testId)
            .query(`
                SELECT
                    q.question_id,
                    q.question_text,
                    q.question_type,
                    q.points,
                    tq.test_question_id,
                    COALESCE(ua.answer_text, CAST(ua.selected_option_id AS NVARCHAR(MAX))) as user_answer,
                    ua.is_correct
                FROM Questions q
                LEFT JOIN TestQuestions tq ON q.question_id = tq.question_id AND tq.test_id = @testId
                OUTER APPLY (
                    SELECT TOP 1 ua2.answer_text, ua2.selected_option_id, ua2.is_correct
                    FROM UserAnswers ua2
                    WHERE ua2.test_question_id = tq.test_question_id AND ua2.attempt_id = @attemptId
                    ORDER BY ua2.answered_at DESC
                ) ua
                WHERE q.test_id = @testId AND q.is_active = 1
            `);
        console.log(`Found ${fullResult.recordset.length} questions with join`);
        fullResult.recordset.forEach((r, i) => {
            console.log(`  ${i+1}. Q${r.question_id} (tq=${r.test_question_id}): answer=${r.user_answer}, correct=${r.is_correct}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

debugTestResults();
