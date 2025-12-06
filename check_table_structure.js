const { poolPromise } = require('./config/database');

async function check() {
  try {
    const pool = await poolPromise;

    console.log('=== UserAnswers Table Structure ===');
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'UserAnswers'
    `);
    console.log(JSON.stringify(result.recordset, null, 2));

    console.log('\n=== TestQuestions Table Structure ===');
    const result2 = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'TestQuestions'
    `);
    console.log(JSON.stringify(result2.recordset, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
