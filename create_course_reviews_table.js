const { poolPromise } = require('./config/database');

async function createCourseReviewsTable() {
    try {
        const pool = await poolPromise;

        // Check if table already exists
        const checkResult = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'course_reviews'
        `);

        if (checkResult.recordset.length > 0) {
            console.log('Table course_reviews already exists');
            process.exit(0);
            return;
        }

        // Create the course_reviews table
        await pool.request().query(`
            CREATE TABLE course_reviews (
                review_id INT IDENTITY(1,1) PRIMARY KEY,
                course_id INT NOT NULL,
                user_id INT NOT NULL,
                rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE(),
                is_approved BIT DEFAULT 1,
                CONSTRAINT FK_course_reviews_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
                CONSTRAINT FK_course_reviews_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                CONSTRAINT UQ_course_user_review UNIQUE (course_id, user_id)
            )
        `);

        console.log('✅ Created course_reviews table successfully');

        // Create index for faster queries
        await pool.request().query(`
            CREATE INDEX IX_course_reviews_course_id ON course_reviews(course_id)
        `);

        console.log('✅ Created index on course_id');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

createCourseReviewsTable();
