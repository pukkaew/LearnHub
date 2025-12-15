// Migration: Add reply_to_comment_id column for nested replies
const { poolPromise, sql } = require('./config/database');

async function addReplyToCommentId() {
    try {
        const pool = await poolPromise;

        console.log('Adding reply_to_comment_id column to Comments table...');

        // Check if column exists
        const checkColumn = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Comments' AND COLUMN_NAME = 'reply_to_comment_id'
        `);

        if (checkColumn.recordset.length === 0) {
            // Add the column
            await pool.request().query(`
                ALTER TABLE Comments
                ADD reply_to_comment_id INT NULL
            `);
            console.log('Column reply_to_comment_id added successfully');

            // Add foreign key constraint
            await pool.request().query(`
                ALTER TABLE Comments
                ADD CONSTRAINT FK_Comments_ReplyToComment
                FOREIGN KEY (reply_to_comment_id) REFERENCES Comments(comment_id)
            `);
            console.log('Foreign key constraint added');
        } else {
            console.log('Column reply_to_comment_id already exists');
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    }
}

addReplyToCommentId();
