const { poolPromise, sql } = require('../config/database');

async function migrate() {
    try {
        const pool = await poolPromise;
        console.log('Starting ArticleViews tracking table migration...\n');

        // 1. Create ArticleViews table
        console.log('1. Creating ArticleViews table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ArticleViews')
            BEGIN
                CREATE TABLE ArticleViews (
                    view_id INT IDENTITY(1,1) PRIMARY KEY,
                    article_id INT NOT NULL,
                    user_id INT NULL,
                    session_id NVARCHAR(255) NULL,
                    ip_address NVARCHAR(45) NULL,
                    user_agent NVARCHAR(500) NULL,
                    viewed_at DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_ArticleViews_Article FOREIGN KEY (article_id)
                        REFERENCES articles(article_id) ON DELETE CASCADE,
                    CONSTRAINT FK_ArticleViews_User FOREIGN KEY (user_id)
                        REFERENCES users(user_id) ON DELETE SET NULL
                );

                -- Index for faster lookups
                CREATE INDEX IX_ArticleViews_Article ON ArticleViews(article_id);
                CREATE INDEX IX_ArticleViews_User ON ArticleViews(user_id);
                CREATE INDEX IX_ArticleViews_Session ON ArticleViews(session_id);
                CREATE INDEX IX_ArticleViews_ViewedAt ON ArticleViews(viewed_at);

                -- Composite index for duplicate checking
                CREATE INDEX IX_ArticleViews_Unique ON ArticleViews(article_id, user_id, session_id, ip_address);

                PRINT 'ArticleViews table created successfully';
            END
            ELSE
            BEGIN
                PRINT 'ArticleViews table already exists';
            END
        `);
        console.log('   Done!\n');

        // 2. Reset views_count to more realistic value based on existing data
        console.log('2. Checking current views_count values...');
        const currentViews = await pool.request().query(`
            SELECT article_id, title, views_count FROM articles WHERE status != 'deleted'
        `);

        console.log('   Current view counts:');
        currentViews.recordset.forEach(a => {
            console.log(`   - Article ${a.article_id}: ${a.views_count} views`);
        });

        // Note: We don't reset the count here, just note it
        console.log('\n   Note: Existing counts preserved. New counting will be accurate.\n');

        console.log('Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Update Article.addView() to check for duplicates');
        console.log('2. Remove duplicate increment calls from controllers');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
