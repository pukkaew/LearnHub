const { poolPromise } = require('./config/database');

async function addColumn() {
    try {
        const pool = await poolPromise;

        // Check if column exists
        const checkResult = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'questions' AND COLUMN_NAME = 'question_order'
        `);

        if (checkResult.recordset.length > 0) {
            console.log('Column question_order already exists');
            process.exit(0);
        }

        // Add column
        await pool.request().query(`
            ALTER TABLE questions
            ADD question_order INT NULL DEFAULT 0
        `);

        console.log('Column question_order added successfully!');

        // Update existing rows with sequential order per test
        await pool.request().query(`
            WITH OrderedQuestions AS (
                SELECT question_id, test_id,
                       ROW_NUMBER() OVER (PARTITION BY test_id ORDER BY question_id) as rn
                FROM questions
            )
            UPDATE q
            SET q.question_order = oq.rn
            FROM questions q
            INNER JOIN OrderedQuestions oq ON q.question_id = oq.question_id
        `);

        console.log('Existing questions updated with sequential order');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

addColumn();
