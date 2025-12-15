const { poolPromise, sql } = require('./config/database');

async function addReplyToColumn() {
    try {
        const pool = await poolPromise;

        // Check if reply_to_user_id column exists
        const checkResult = await pool.request().query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Comments' AND COLUMN_NAME = 'reply_to_user_id'
        `);

        if (checkResult.recordset.length === 0) {
            console.log('Adding reply_to_user_id column...');
            await pool.request().query(`
                ALTER TABLE Comments
                ADD reply_to_user_id INT NULL
            `);
            console.log('Column reply_to_user_id added successfully!');
        } else {
            console.log('Column reply_to_user_id already exists');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

addReplyToColumn();
