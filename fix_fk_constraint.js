const { poolPromise } = require('./config/database');

async function fixFKConstraint() {
  try {
    const pool = await poolPromise;

    console.log('=== Fixing TestQuestions FK Constraint ===\n');

    // Drop the existing FK to QuestionBank
    console.log('1. Dropping existing FK constraint FK__TestQuest__quest__51BA1E3A...');
    try {
      await pool.request().query(`
        ALTER TABLE TestQuestions DROP CONSTRAINT FK__TestQuest__quest__51BA1E3A
      `);
      console.log('   Dropped successfully.\n');
    } catch (err) {
      console.log('   Constraint may not exist or already dropped:', err.message, '\n');
    }

    // Create new FK to Questions table
    console.log('2. Creating new FK constraint to Questions table...');
    try {
      await pool.request().query(`
        ALTER TABLE TestQuestions
        ADD CONSTRAINT FK_TestQuestions_Questions
        FOREIGN KEY (question_id) REFERENCES Questions(question_id)
        ON DELETE CASCADE
      `);
      console.log('   Created successfully.\n');
    } catch (err) {
      console.log('   Error creating constraint:', err.message, '\n');
    }

    // Verify new constraints
    console.log('3. Verifying constraints...');
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
    console.log('   Current TestQuestions constraints:');
    console.log(JSON.stringify(result.recordset, null, 2));

    console.log('\n=== Done! ===');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixFKConstraint();
