// Check Test 4 data for debugging
const { poolPromise, sql } = require('./config/database');

async function checkTest4Data() {
    try {
        const pool = await poolPromise;

        // 1. Check Questions for test_id = 4
        console.log('\n=== Questions for test_id = 4 ===');
        const questions = await pool.request()
            .query(`SELECT question_id, test_id, question_text, question_type, is_active
                    FROM Questions WHERE test_id = 4`);
        console.log('Questions:', questions.recordset);

        // 2. Check TestQuestions for test_id = 4
        console.log('\n=== TestQuestions for test_id = 4 ===');
        const testQuestions = await pool.request()
            .query(`SELECT * FROM TestQuestions WHERE test_id = 4`);
        console.log('TestQuestions:', testQuestions.recordset);

        // 3. Check QuestionOptions for question_id from test 4
        console.log('\n=== QuestionOptions for test 4 questions ===');
        const options = await pool.request()
            .query(`SELECT qo.*
                    FROM QuestionOptions qo
                    JOIN Questions q ON qo.question_id = q.question_id
                    WHERE q.test_id = 4`);
        console.log('Options:', options.recordset);

        // 4. Check TestAttempts for test_id = 4
        console.log('\n=== TestAttempts for test_id = 4 ===');
        const attempts = await pool.request()
            .query(`SELECT * FROM TestAttempts WHERE test_id = 4 ORDER BY started_at DESC`);
        console.log('Attempts:', attempts.recordset);

        // 5. Check UserAnswers for test 4 attempts
        console.log('\n=== UserAnswers for test 4 attempts ===');
        const userAnswers = await pool.request()
            .query(`SELECT ua.*
                    FROM UserAnswers ua
                    JOIN TestAttempts ta ON ua.attempt_id = ta.attempt_id
                    WHERE ta.test_id = 4`);
        console.log('UserAnswers:', userAnswers.recordset);

        // 6. Run the exact same query from getAttemptResults
        console.log('\n=== Results Query Output ===');
        const latestAttempt = attempts.recordset[0];
        if (latestAttempt) {
            const attemptId = latestAttempt.attempt_id;
            console.log('Using attempt_id:', attemptId);

            const resultsQuery = await pool.request()
                .input('attemptId', sql.Int, attemptId)
                .input('testId', sql.Int, 4)
                .query(`
                    SELECT
                        q.question_id,
                        q.question_text,
                        q.question_type,
                        q.points,
                        q.difficulty_level as difficulty,
                        q.explanation,
                        q.question_image,
                        q.correct_answer as q_correct_answer,
                        COALESCE(ua.answer_text, CAST(ua.selected_option_id AS NVARCHAR(MAX))) as user_answer,
                        ua.is_correct,
                        ua.points_earned,
                        CASE
                            WHEN q.question_type = 'multiple_choice' THEN
                                CAST((SELECT TOP 1 option_id FROM QuestionOptions WHERE question_id = q.question_id AND is_correct = 1) AS NVARCHAR(MAX))
                            WHEN q.question_type = 'true_false' THEN
                                (SELECT TOP 1 option_text FROM QuestionOptions WHERE question_id = q.question_id AND is_correct = 1)
                            ELSE NULL
                        END as correct_answer
                    FROM Questions q
                    LEFT JOIN TestQuestions tq ON q.question_id = tq.question_id AND tq.test_id = @testId
                    LEFT JOIN UserAnswers ua ON tq.test_question_id = ua.test_question_id AND ua.attempt_id = @attemptId
                    WHERE q.test_id = @testId AND q.is_active = 1
                    ORDER BY COALESCE(tq.question_order, q.question_id), q.question_id
                `);
            console.log('Results Query:', resultsQuery.recordset);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTest4Data();
