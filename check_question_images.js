const { poolPromise, sql } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function checkQuestionImages() {
    try {
        const pool = await poolPromise;

        // Check Test 13 questions
        console.log('=== TEST 13 QUESTIONS ===\n');
        const test13 = await pool.request().query(`
            SELECT t.test_id, t.title as test_title, q.question_id, q.question_text, q.question_image
            FROM Tests t
            LEFT JOIN TestQuestions tq ON t.test_id = tq.test_id
            LEFT JOIN Questions q ON tq.question_id = q.question_id
            WHERE t.test_id = 13
        `);

        console.log('Test 13:');
        test13.recordset.forEach(r => {
            console.log(`  Q${r.question_id}: ${(r.question_text || '').substring(0, 30)}...`);
            console.log(`  Image: ${r.question_image || 'NULL'}`);
            console.log('');
        });

        // Check options for Test 13 questions
        console.log('\n=== TEST 13 OPTIONS WITH IMAGES ===\n');
        const options = await pool.request().query(`
            SELECT o.option_id, o.question_id, o.option_text, o.option_image
            FROM QuestionOptions o
            WHERE o.question_id IN (
                SELECT q.question_id FROM Questions q
                INNER JOIN TestQuestions tq ON q.question_id = tq.question_id
                WHERE tq.test_id = 13
            )
        `);

        options.recordset.forEach(o => {
            console.log(`  Option ${o.option_id} (Q${o.question_id}): ${(o.option_text || '').substring(0, 30)}`);
            console.log(`  Image: ${o.option_image || 'NULL'}`);
        });

        // Test direct URL access
        console.log('\n=== TEST URL ACCESS ===\n');
        const testImagePath = '/uploads/images/question_1765498889682_61c1e410e61bda13.jpg';
        const fullPath = path.join(__dirname, testImagePath);
        console.log(`Test image: ${testImagePath}`);
        console.log(`Full path: ${fullPath}`);
        console.log(`File exists: ${fs.existsSync(fullPath)}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkQuestionImages();
