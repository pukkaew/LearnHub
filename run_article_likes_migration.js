const { poolPromise, sql } = require('./config/database');

async function createArticleLikesTable() {
    try {
        const pool = await poolPromise;

        // Check if table exists
        const checkResult = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'article_likes'
        `);

        if (checkResult.recordset.length > 0) {
            console.log('Table article_likes already exists');
            process.exit(0);
        }

        // Create table
        await pool.request().query(`
            CREATE TABLE article_likes (
                like_id INT IDENTITY(1,1) PRIMARY KEY,
                article_id INT NOT NULL,
                user_id INT NOT NULL,
                created_at DATETIME DEFAULT GETDATE(),
                CONSTRAINT FK_ArticleLikes_Article FOREIGN KEY (article_id)
                    REFERENCES articles(article_id) ON DELETE CASCADE,
                CONSTRAINT FK_ArticleLikes_User FOREIGN KEY (user_id)
                    REFERENCES users(user_id) ON DELETE CASCADE,
                CONSTRAINT UQ_ArticleLikes_User_Article UNIQUE (article_id, user_id)
            )
        `);

        // Create indexes
        await pool.request().query(`
            CREATE INDEX IX_ArticleLikes_ArticleId ON article_likes(article_id)
        `);

        await pool.request().query(`
            CREATE INDEX IX_ArticleLikes_UserId ON article_likes(user_id)
        `);

        console.log('Table article_likes created successfully!');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createArticleLikesTable();
