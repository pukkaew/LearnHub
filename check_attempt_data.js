const { poolPromise, sql } = require('./config/database');

async function check() {
  try {
    const pool = await poolPromise;

    // Check TestAttempts
    console.log('=== TestAttempts for attempt_id=1 ===');
    const attempts = await pool.request().query('SELECT * FROM TestAttempts WHERE attempt_id = 1');
    console.log(JSON.stringify(attempts.recordset, null, 2));

    // Get test_id from attempt
    const testId = attempts.recordset[0]?.test_id;

    if (testId) {
      // Check Questions linked to this test
      console.log('\n=== Questions for test_id=' + testId + ' ===');
      const questions = await pool.request()
        .input('testId', sql.Int, testId)
        .query('SELECT question_id, question_text, question_type, test_id FROM Questions WHERE test_id = @testId');
      console.log('Question count:', questions.recordset.length);
      console.log(JSON.stringify(questions.recordset, null, 2));

      // Check TestQuestions
      console.log('\n=== TestQuestions for test_id=' + testId + ' ===');
      const testQuestions = await pool.request()
        .input('testId', sql.Int, testId)
        .query('SELECT * FROM TestQuestions WHERE test_id = @testId');
      console.log('TestQuestions count:', testQuestions.recordset.length);
      console.log(JSON.stringify(testQuestions.recordset, null, 2));

      // Check UserAnswers for attempt 1
      console.log('\n=== UserAnswers for attempt_id=1 ===');
      const userAnswers = await pool.request()
        .query('SELECT * FROM UserAnswers WHERE attempt_id = 1');
      console.log('UserAnswers count:', userAnswers.recordset.length);
      console.log(JSON.stringify(userAnswers.recordset, null, 2));

      // Check QuestionOptions for first question
      if (questions.recordset.length > 0) {
        const firstQuestionId = questions.recordset[0].question_id;
        console.log('\n=== QuestionOptions for question_id=' + firstQuestionId + ' ===');
        const options = await pool.request()
          .input('questionId', sql.Int, firstQuestionId)
          .query('SELECT * FROM QuestionOptions WHERE question_id = @questionId');
        console.log(JSON.stringify(options.recordset, null, 2));
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
