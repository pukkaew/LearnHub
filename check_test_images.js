const { poolPromise, sql } = require('./config/database');

async function checkTestImages() {
    try {
        const pool = await poolPromise;

        console.log('=== TEST 13 QUESTION IMAGES ===\n');

        // Get questions for test 13 via TestQuestions
        const result = await pool.request()
            .input('testId', sql.Int, 13)
            .query(`
                SELECT q.question_id, q.question_text, q.question_image
                FROM Questions q
                INNER JOIN TestQuestions tq ON q.question_id = tq.question_id
                WHERE tq.test_id = @testId
                ORDER BY tq.question_order, q.question_id
            `);

        console.log('Questions:');
        result.recordset.forEach(q => {
            const text = q.question_text || '';
            console.log(`  Q${q.question_id}: "${text.substring(0, 50)}..."`);
            console.log(`  Image: ${q.question_image || 'NULL'}`);
            console.log('');
        });

        // Get options with images
        console.log('\n=== OPTIONS WITH IMAGES ===\n');
        const options = await pool.request()
            .input('testId', sql.Int, 13)
            .query(`
                SELECT o.option_id, o.question_id, o.option_text, o.option_image
                FROM QuestionOptions o
                INNER JOIN Questions q ON o.question_id = q.question_id
                INNER JOIN TestQuestions tq ON q.question_id = tq.question_id
                WHERE tq.test_id = @testId AND o.option_image IS NOT NULL
                ORDER BY o.question_id, o.option_id
            `);

        if (options.recordset.length > 0) {
            options.recordset.forEach(o => {
                console.log(`  Option ${o.option_id} (Q${o.question_id}): ${o.option_image}`);
            });
        } else {
            console.log('  No options with images found');
        }

        // Also check all questions with images
        console.log('\n=== ALL QUESTIONS WITH IMAGES ===\n');
        const allWithImages = await pool.request().query(`
            SELECT q.question_id, q.question_text, q.question_image
            FROM Questions q
            WHERE q.question_image IS NOT NULL
        `);

        if (allWithImages.recordset.length > 0) {
            allWithImages.recordset.forEach(q => {
                console.log(`  Q${q.question_id}: ${q.question_image}`);
            });
        } else {
            console.log('  No questions with images in database');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTestImages();
