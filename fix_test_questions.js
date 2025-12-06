const { poolPromise, sql } = require('./config/database');

async function fixTestQuestions() {
  try {
    const pool = await poolPromise;

    console.log('=== Fixing TestQuestions table ===\n');

    // Get all questions with test_id that don't have TestQuestions records
    const questionsResult = await pool.request().query(`
      SELECT q.question_id, q.test_id, q.points
      FROM Questions q
      WHERE q.test_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM TestQuestions tq
          WHERE tq.question_id = q.question_id AND tq.test_id = q.test_id
        )
    `);

    console.log(`Found ${questionsResult.recordset.length} questions without TestQuestions records\n`);

    if (questionsResult.recordset.length === 0) {
      console.log('No fixes needed!');
      process.exit(0);
      return;
    }

    // Group by test_id for ordering
    const questionsByTest = {};
    for (const q of questionsResult.recordset) {
      if (!questionsByTest[q.test_id]) {
        questionsByTest[q.test_id] = [];
      }
      questionsByTest[q.test_id].push(q);
    }

    // Insert TestQuestions records
    for (const testId of Object.keys(questionsByTest)) {
      const questions = questionsByTest[testId];
      console.log(`Processing test_id=${testId} with ${questions.length} questions`);

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await pool.request()
          .input('testId', sql.Int, q.test_id)
          .input('questionId', sql.Int, q.question_id)
          .input('questionOrder', sql.Int, i + 1)
          .input('points', sql.Decimal(5, 2), q.points || 1)
          .query(`
            INSERT INTO TestQuestions (test_id, question_id, question_order, points, created_at)
            VALUES (@testId, @questionId, @questionOrder, @points, GETDATE())
          `);
        console.log(`  - Added TestQuestions for question_id=${q.question_id}`);
      }
    }

    console.log('\n=== Done! ===\n');

    // Verify
    const verifyResult = await pool.request().query(`
      SELECT test_id, COUNT(*) as count FROM TestQuestions GROUP BY test_id
    `);
    console.log('TestQuestions summary by test:');
    console.log(JSON.stringify(verifyResult.recordset, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixTestQuestions();
