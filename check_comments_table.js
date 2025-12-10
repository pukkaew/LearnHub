const { poolPromise, sql } = require('./config/database');

(async () => {
    try {
        const pool = await poolPromise;

        // Check if Comments table exists
        const result = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Comments'
        `);
        console.log('Comments table exists:', result.recordset.length > 0);

        if (result.recordset.length === 0) {
            console.log('Creating Comments table...');
            await pool.request().query(`
                CREATE TABLE Comments (
                    comment_id INT IDENTITY(1,1) PRIMARY KEY,
                    article_id INT NOT NULL,
                    user_id INT NOT NULL,
                    comment_text NVARCHAR(MAX) NOT NULL,
                    parent_comment_id INT NULL,
                    status NVARCHAR(50) DEFAULT 'active',
                    created_at DATETIME2 DEFAULT GETDATE(),
                    updated_at DATETIME2 DEFAULT GETDATE(),
                    FOREIGN KEY (article_id) REFERENCES articles(article_id),
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                )
            `);
            console.log('Comments table created successfully');
        } else {
            const cols = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Comments' ORDER BY ORDINAL_POSITION
            `);
            console.log('Columns:', cols.recordset.map(c => c.COLUMN_NAME + ':' + c.DATA_TYPE).join(', '));
        }
    } catch(e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
})();
