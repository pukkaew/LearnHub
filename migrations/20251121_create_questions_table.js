const { poolPromise, sql } = require('../config/database');

/**
 * Migration: Create Questions Table
 * Date: 2025-11-21
 * Purpose: Create missing Questions table for Test management system
 */

async function up() {
    const pool = await poolPromise;

    try {
        console.log('🚀 Creating Questions table...');

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Questions' AND xtype='U')
            CREATE TABLE Questions (
                question_id INT PRIMARY KEY IDENTITY(1,1),
                bank_id INT NULL,
                test_id INT NULL,

                -- Question Content
                question_type NVARCHAR(20) NOT NULL DEFAULT 'MULTIPLE_CHOICE',
                    -- 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'ESSAY', 'SHORT_ANSWER', 'MATCHING', 'FILL_BLANK'
                question_text NVARCHAR(MAX) NOT NULL,
                question_image NVARCHAR(500) NULL,

                -- Scoring
                points DECIMAL(5,2) NOT NULL DEFAULT 1.0,
                difficulty_level INT DEFAULT 3,
                    -- 1=Very Easy, 2=Easy, 3=Medium, 4=Hard, 5=Very Hard
                time_estimate_seconds INT DEFAULT 60,

                -- Help & Explanation
                explanation NVARCHAR(MAX) NULL,
                    -- Explanation for correct answer
                tags NVARCHAR(500) NULL,
                    -- Comma-separated tags

                -- Analytics
                usage_count INT DEFAULT 0,
                correct_count INT DEFAULT 0,

                -- Status
                is_active BIT DEFAULT 1,
                version INT DEFAULT 1,

                -- Audit
                created_by INT,
                created_date DATETIME DEFAULT GETDATE(),
                modified_date DATETIME DEFAULT GETDATE(),

                FOREIGN KEY (test_id) REFERENCES Tests(test_id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES Users(user_id)
            );
        `);
        console.log('✅ Questions table created');

        // Create index for better performance
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Questions_TestId')
            CREATE INDEX IX_Questions_TestId ON Questions(test_id);
        `);

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Questions_BankId')
            CREATE INDEX IX_Questions_BankId ON Questions(bank_id);
        `);
        console.log('✅ Indexes created');

        // Create QuestionOptions table if not exists
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QuestionOptions' AND xtype='U')
            CREATE TABLE QuestionOptions (
                option_id INT PRIMARY KEY IDENTITY(1,1),
                question_id INT NOT NULL,

                option_text NVARCHAR(500) NOT NULL,
                option_image NVARCHAR(500) NULL,
                is_correct BIT DEFAULT 0,
                option_order INT DEFAULT 0,

                created_date DATETIME DEFAULT GETDATE(),

                FOREIGN KEY (question_id) REFERENCES Questions(question_id) ON DELETE CASCADE
            );
        `);
        console.log('✅ QuestionOptions table created/verified');

        // Create index for QuestionOptions
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QuestionOptions_QuestionId')
            CREATE INDEX IX_QuestionOptions_QuestionId ON QuestionOptions(question_id);
        `);
        console.log('✅ QuestionOptions indexes created');

        console.log('✨ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function down() {
    const pool = await poolPromise;

    try {
        console.log('🔄 Rolling back Questions table creation...');

        // Drop QuestionOptions first (due to foreign key)
        await pool.request().query(`
            IF EXISTS (SELECT * FROM sysobjects WHERE name='QuestionOptions' AND xtype='U')
            DROP TABLE QuestionOptions;
        `);

        await pool.request().query(`
            IF EXISTS (SELECT * FROM sysobjects WHERE name='Questions' AND xtype='U')
            DROP TABLE Questions;
        `);

        console.log('✅ Rollback completed');

    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };

// Run migration if called directly
if (require.main === module) {
    (async () => {
        try {
            await up();
            process.exit(0);
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    })();
}
