const { poolPromise, sql } = require('../config/database');

/**
 * Migration: Create Enhanced Question Bank System
 * Date: 2025-11-20
 * Purpose: Create comprehensive question bank system for flexible test creation
 */

async function up() {
    const pool = await poolPromise;

    try {
        console.log('🚀 Starting Question Bank System Migration...');

        // 1. Create QuestionBank table
        console.log('📝 Creating QuestionBank table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QuestionBank' AND xtype='U')
            CREATE TABLE QuestionBank (
                question_id INT PRIMARY KEY IDENTITY(1,1),
                course_id INT,
                chapter_id INT NULL,
                lesson_id INT NULL,

                -- Question Content
                question_text NVARCHAR(MAX) NOT NULL,
                question_type VARCHAR(50) NOT NULL DEFAULT 'multiple-choice',
                    -- 'multiple-choice', 'true-false', 'short-answer', 'essay', 'matching', 'fill-in-blank'

                -- Media
                image_url VARCHAR(500) NULL,
                video_url VARCHAR(500) NULL,
                audio_url VARCHAR(500) NULL,

                -- Difficulty & Tags
                difficulty_level VARCHAR(20) DEFAULT 'medium',
                    -- 'easy', 'medium', 'hard', 'expert'
                topic_tags NVARCHAR(500) NULL,
                    -- JSON array of tags: ["programming", "loops", "syntax"]
                learning_objective NVARCHAR(MAX) NULL,
                bloom_taxonomy_level VARCHAR(50) NULL,
                    -- 'remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'

                -- Points & Scoring
                default_points DECIMAL(5,2) DEFAULT 1.0,

                -- Analytics
                usage_count INT DEFAULT 0,
                correct_count INT DEFAULT 0,
                incorrect_count INT DEFAULT 0,
                success_rate DECIMAL(5,2) DEFAULT 0,
                avg_time_seconds INT DEFAULT 0,

                -- Metadata
                explanation NVARCHAR(MAX) NULL,
                    -- Explanation for the answer
                hint NVARCHAR(MAX) NULL,
                    -- Hint to help answer
                reference NVARCHAR(500) NULL,
                    -- Reference to textbook/resource

                -- Status & Visibility
                is_active BIT DEFAULT 1,
                is_verified BIT DEFAULT 0,
                    -- Question has been reviewed by admin
                is_public BIT DEFAULT 0,
                    -- Can be used by other courses

                -- Audit
                created_by INT,
                created_at DATETIME DEFAULT GETDATE(),
                updated_by INT NULL,
                updated_at DATETIME DEFAULT GETDATE(),
                verified_by INT NULL,
                verified_at DATETIME NULL,

                FOREIGN KEY (course_id) REFERENCES Courses(course_id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES Users(user_id)
            );
        `);
        console.log('✅ QuestionBank table created');

        // 2. Create AnswerOptions table
        console.log('📝 Creating AnswerOptions table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AnswerOptions' AND xtype='U')
            CREATE TABLE AnswerOptions (
                option_id INT PRIMARY KEY IDENTITY(1,1),
                question_id INT NOT NULL,

                -- Option Content
                option_text NVARCHAR(MAX) NOT NULL,
                is_correct BIT DEFAULT 0,
                option_order INT DEFAULT 0,

                -- Explanation
                explanation NVARCHAR(MAX) NULL,
                    -- Why this option is correct/incorrect

                -- Metadata
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE(),

                FOREIGN KEY (question_id) REFERENCES QuestionBank(question_id) ON DELETE CASCADE
            );
        `);
        console.log('✅ AnswerOptions table created');

        // 3. Update Tests table with new fields
        console.log('📝 Updating Tests table...');
        await pool.request().query(`
            -- Add chapter_id if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'chapter_id')
            ALTER TABLE Tests ADD chapter_id INT NULL;

            -- Add lesson_id if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'lesson_id')
            ALTER TABLE Tests ADD lesson_id INT NULL;

            -- Add test_category if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'test_category')
            ALTER TABLE Tests ADD test_category VARCHAR(50) NULL;

            -- Add available_after_chapter_complete if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'available_after_chapter_complete')
            ALTER TABLE Tests ADD available_after_chapter_complete BIT DEFAULT 0;

            -- Add required_for_completion if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'required_for_completion')
            ALTER TABLE Tests ADD required_for_completion BIT DEFAULT 0;

            -- Add weight_in_course if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'weight_in_course')
            ALTER TABLE Tests ADD weight_in_course DECIMAL(5,2) DEFAULT 0;

            -- Add available_from if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'available_from')
            ALTER TABLE Tests ADD available_from DATETIME NULL;

            -- Add available_until if not exists
            IF NOT EXISTS (SELECT * FROM sys.columns
                          WHERE object_id = OBJECT_ID('Tests')
                          AND name = 'available_until')
            ALTER TABLE Tests ADD available_until DATETIME NULL;
        `);
        console.log('✅ Tests table updated');

        // 4. Create TestQuestions linking table
        console.log('📝 Creating TestQuestions table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TestQuestions' AND xtype='U')
            CREATE TABLE TestQuestions (
                test_question_id INT PRIMARY KEY IDENTITY(1,1),
                test_id INT NOT NULL,
                question_id INT NOT NULL,

                -- Question Settings
                points DECIMAL(5,2) DEFAULT 1.0,
                question_order INT DEFAULT 0,
                is_required BIT DEFAULT 1,

                -- Override question if needed
                custom_question_text NVARCHAR(MAX) NULL,
                    -- NULL = use from QuestionBank
                custom_explanation NVARCHAR(MAX) NULL,

                -- Metadata
                created_at DATETIME DEFAULT GETDATE(),

                FOREIGN KEY (test_id) REFERENCES Tests(test_id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES QuestionBank(question_id) ON DELETE CASCADE
            );
        `);
        console.log('✅ TestQuestions table created');

        // 5. Create or Update TestAttempts table
        console.log('📝 Creating/Updating TestAttempts table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='TestAttempts' AND xtype='U')
            CREATE TABLE TestAttempts (
                attempt_id INT PRIMARY KEY IDENTITY(1,1),
                test_id INT NOT NULL,
                user_id INT NOT NULL,

                -- Attempt Info
                attempt_number INT DEFAULT 1,
                started_at DATETIME DEFAULT GETDATE(),
                completed_at DATETIME NULL,
                time_spent_seconds INT DEFAULT 0,

                -- Scoring
                total_questions INT DEFAULT 0,
                correct_answers INT DEFAULT 0,
                score DECIMAL(5,2) DEFAULT 0,
                percentage DECIMAL(5,2) DEFAULT 0,
                passed BIT DEFAULT 0,

                -- Status
                status VARCHAR(20) DEFAULT 'in-progress',
                    -- 'in-progress', 'completed', 'abandoned', 'grading'
                is_submitted BIT DEFAULT 0,

                -- Metadata
                ip_address VARCHAR(50) NULL,
                user_agent VARCHAR(500) NULL,

                FOREIGN KEY (test_id) REFERENCES Tests(test_id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES Users(user_id)
            );
        `);
        console.log('✅ TestAttempts table created/updated');

        // 6. Create UserAnswers table
        console.log('📝 Creating UserAnswers table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserAnswers' AND xtype='U')
            CREATE TABLE UserAnswers (
                answer_id INT PRIMARY KEY IDENTITY(1,1),
                attempt_id INT NOT NULL,
                test_question_id INT NOT NULL,

                -- Answer
                selected_option_id INT NULL,
                    -- For multiple choice
                answer_text NVARCHAR(MAX) NULL,
                    -- For short answer/essay
                answer_data NVARCHAR(MAX) NULL,
                    -- JSON for complex answer types (matching, etc.)

                -- Scoring
                is_correct BIT NULL,
                    -- NULL for manually graded questions
                points_earned DECIMAL(5,2) DEFAULT 0,
                feedback NVARCHAR(MAX) NULL,
                    -- Instructor feedback

                -- Timing
                time_spent_seconds INT DEFAULT 0,
                answered_at DATETIME DEFAULT GETDATE(),

                -- Grading
                graded_by INT NULL,
                graded_at DATETIME NULL,

                FOREIGN KEY (attempt_id) REFERENCES TestAttempts(attempt_id) ON DELETE CASCADE,
                FOREIGN KEY (test_question_id) REFERENCES TestQuestions(test_question_id),
                FOREIGN KEY (selected_option_id) REFERENCES AnswerOptions(option_id),
                FOREIGN KEY (graded_by) REFERENCES Users(user_id)
            );
        `);
        console.log('✅ UserAnswers table created');

        // 7. Create indexes for performance
        console.log('📝 Creating indexes...');
        await pool.request().query(`
            -- QuestionBank indexes
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QuestionBank_CourseId')
            CREATE INDEX IX_QuestionBank_CourseId ON QuestionBank(course_id);

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QuestionBank_QuestionType')
            CREATE INDEX IX_QuestionBank_QuestionType ON QuestionBank(question_type);

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_QuestionBank_Difficulty')
            CREATE INDEX IX_QuestionBank_Difficulty ON QuestionBank(difficulty_level);

            -- TestQuestions indexes
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TestQuestions_TestId')
            CREATE INDEX IX_TestQuestions_TestId ON TestQuestions(test_id);

            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TestQuestions_QuestionId')
            CREATE INDEX IX_TestQuestions_QuestionId ON TestQuestions(question_id);

            -- UserAnswers indexes
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_UserAnswers_AttemptId')
            CREATE INDEX IX_UserAnswers_AttemptId ON UserAnswers(attempt_id);

            -- Tests indexes
            IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Tests_ChapterId')
            CREATE INDEX IX_Tests_ChapterId ON Tests(chapter_id) WHERE chapter_id IS NOT NULL;
        `);
        console.log('✅ Indexes created');

        console.log('✅ Migration completed successfully!');
        return { success: true };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function down() {
    const pool = await poolPromise;

    try {
        console.log('🔄 Rolling back Question Bank System Migration...');

        // Drop tables in reverse order
        await pool.request().query(`
            DROP TABLE IF EXISTS UserAnswers;
            DROP TABLE IF EXISTS TestAttempts;
            DROP TABLE IF EXISTS TestQuestions;
            DROP TABLE IF EXISTS AnswerOptions;
            DROP TABLE IF EXISTS QuestionBank;

            -- Remove added columns from Tests
            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'chapter_id')
            ALTER TABLE Tests DROP COLUMN chapter_id;

            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'lesson_id')
            ALTER TABLE Tests DROP COLUMN lesson_id;

            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'test_category')
            ALTER TABLE Tests DROP COLUMN test_category;

            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'available_after_chapter_complete')
            ALTER TABLE Tests DROP COLUMN available_after_chapter_complete;

            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'required_for_completion')
            ALTER TABLE Tests DROP COLUMN required_for_completion;

            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'weight_in_course')
            ALTER TABLE Tests DROP COLUMN weight_in_course;

            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'available_from')
            ALTER TABLE Tests DROP COLUMN available_from;

            IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Tests') AND name = 'available_until')
            ALTER TABLE Tests DROP COLUMN available_until;
        `);

        console.log('✅ Rollback completed');
        return { success: true };

    } catch (error) {
        console.error('❌ Rollback failed:', error);
        throw error;
    }
}

module.exports = { up, down };
