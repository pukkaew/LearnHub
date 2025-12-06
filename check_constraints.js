const { poolPromise } = require('./config/database');

async function check() {
  try {
    const pool = await poolPromise;

    console.log('=== TestQuestions Foreign Key Constraints ===');
    const result = await pool.request().query(`
      SELECT
        fk.name AS fk_name,
        parent_table.name AS parent_table,
        parent_col.name AS parent_column,
        ref_table.name AS referenced_table,
        ref_col.name AS referenced_column
      FROM sys.foreign_keys fk
      INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables parent_table ON fk.parent_object_id = parent_table.object_id
      INNER JOIN sys.columns parent_col ON fkc.parent_object_id = parent_col.object_id AND fkc.parent_column_id = parent_col.column_id
      INNER JOIN sys.tables ref_table ON fk.referenced_object_id = ref_table.object_id
      INNER JOIN sys.columns ref_col ON fkc.referenced_object_id = ref_col.object_id AND fkc.referenced_column_id = ref_col.column_id
      WHERE parent_table.name = 'TestQuestions'
    `);
    console.log(JSON.stringify(result.recordset, null, 2));

    // Check if QuestionBank table has the question
    console.log('\n=== Questions in Questions table (test_id not null) ===');
    const questions = await pool.request().query(`
      SELECT question_id, test_id, question_text FROM Questions WHERE test_id IS NOT NULL
    `);
    console.log(JSON.stringify(questions.recordset, null, 2));

    // Check QuestionBank
    console.log('\n=== QuestionBank table ===');
    const bank = await pool.request().query(`
      SELECT TOP 10 * FROM QuestionBank
    `);
    console.log(JSON.stringify(bank.recordset, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
