const { poolPromise, sql } = require('./config/database');

async function check() {
    try {
        const pool = await poolPromise;

        // Check questions for test 13
        const questions = await pool.request()
            .input('testId', sql.Int, 13)
            .query('SELECT question_id, question_text, question_image FROM Questions WHERE test_id = @testId');

        console.log('Questions for test 13:');
        questions.recordset.forEach(q => {
            console.log('  Q' + q.question_id + ': ' + q.question_text.substring(0, 50));
            console.log('    Image: ' + (q.question_image || 'NULL'));
        });

        // Check options
        const options = await pool.request()
            .input('testId', sql.Int, 13)
            .query(`
                SELECT o.option_id, o.question_id, o.option_text, o.option_image
                FROM QuestionOptions o
                INNER JOIN Questions q ON o.question_id = q.question_id
                WHERE q.test_id = @testId
            `);

        console.log('\nOptions for test 13:');
        options.recordset.forEach(o => {
            console.log('  Option ' + o.option_id + ' (Q' + o.question_id + '): ' + o.option_text.substring(0, 30));
            console.log('    Image: ' + (o.option_image || 'NULL'));
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}
check();
