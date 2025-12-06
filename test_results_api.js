const { poolPromise, sql } = require('./config/database');
const Test = require('./models/Test');

async function testResultsAPI() {
  try {
    const pool = await poolPromise;

    console.log('=== Testing Test Results API ===\n');

    // Check TestQuestions now
    console.log('1. Checking TestQuestions table:');
    const tq = await pool.request().query('SELECT * FROM TestQuestions');
    console.log(`   Found ${tq.recordset.length} TestQuestions records`);
    console.log(JSON.stringify(tq.recordset, null, 2));

    // Get attempt 1 results
    console.log('\n2. Testing getAttemptResults for attempt_id=1:');
    try {
      const results = await Test.getAttemptResults(1);
      if (results) {
        console.log('   Success! Results returned:');
        console.log(`   - test_title: ${results.test_title}`);
        console.log(`   - score: ${results.score}%`);
        console.log(`   - passing_score: ${results.passing_score}%`);
        console.log(`   - correct_answers: ${results.correct_answers}`);
        console.log(`   - incorrect_answers: ${results.incorrect_answers}`);
        console.log(`   - total_questions: ${results.total_questions}`);
        console.log(`   - questions count: ${results.questions?.length || 0}`);

        if (results.questions && results.questions.length > 0) {
          console.log('\n   Questions detail:');
          results.questions.forEach((q, i) => {
            console.log(`   [${i+1}] ${q.question_text}`);
            console.log(`       Type: ${q.question_type}, Points: ${q.points}`);
            console.log(`       User Answer: ${q.user_answer || 'N/A'}`);
            console.log(`       Correct: ${q.is_correct}`);
            if (q.options) {
              console.log(`       Options: ${q.options.map(o => `${o.option_text}${o.is_correct ? '(correct)' : ''}`).join(', ')}`);
            }
          });
        }
      } else {
        console.log('   No results returned (attempt not found)');
      }
    } catch (err) {
      console.log('   Error:', err.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testResultsAPI();
