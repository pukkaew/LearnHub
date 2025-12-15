-- Create article_likes table for tracking user likes
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'article_likes')
BEGIN
    CREATE TABLE article_likes (
        like_id INT IDENTITY(1,1) PRIMARY KEY,
        article_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_ArticleLikes_Article FOREIGN KEY (article_id) REFERENCES articles(article_id) ON DELETE CASCADE,
        CONSTRAINT FK_ArticleLikes_User FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        CONSTRAINT UQ_ArticleLikes_User_Article UNIQUE (article_id, user_id)
    );

    CREATE INDEX IX_ArticleLikes_ArticleId ON article_likes(article_id);
    CREATE INDEX IX_ArticleLikes_UserId ON article_likes(user_id);

    PRINT 'Table article_likes created successfully';
END
ELSE
BEGIN
    PRINT 'Table article_likes already exists';
END
