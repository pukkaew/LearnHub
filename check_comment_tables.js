const { poolPromise, sql } = require('./config/database');

async function checkTables() {
    try {
        const pool = await poolPromise;

        // Check CommentFollows table
        console.log('Checking CommentFollows table...');
        const followsResult = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'CommentFollows'
        `);
        console.log('CommentFollows exists:', followsResult.recordset.length > 0);

        // Check CommentLikes table
        console.log('\nChecking CommentLikes table...');
        const likesResult = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'CommentLikes'
        `);
        console.log('CommentLikes exists:', likesResult.recordset.length > 0);

        // Check Comments table structure
        console.log('\nChecking Comments table structure...');
        const commentsResult = await pool.request().query(`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Comments'
            ORDER BY ORDINAL_POSITION
        `);
        console.log('Comments columns:');
        commentsResult.recordset.forEach(col => {
            console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });

        // Check if parent_id exists for nested replies
        const hasParentId = commentsResult.recordset.some(col => col.COLUMN_NAME === 'parent_id');
        console.log('\nHas parent_id for nested replies:', hasParentId);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTables();
