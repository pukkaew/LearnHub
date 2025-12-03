const { poolPromise } = require('../config/database');

async function createLessonProgress() {
    try {
        const pool = await poolPromise;

        console.log('Creating Lesson Progress Tracking System...\n');

        // =========================================
        // 1. lesson_progress Table - ติดตามการเรียนแต่ละบทเรียน
        // =========================================
        console.log('Step 1: Creating lesson_progress table...');

        const checkTable = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'lesson_progress'
        `);

        if (checkTable.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE lesson_progress (
                    progress_id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    lesson_id INT NOT NULL,
                    course_id INT NOT NULL,

                    -- Time tracking
                    time_spent_seconds INT DEFAULT 0,
                    min_time_required_seconds INT DEFAULT 0,
                    time_requirement_met BIT DEFAULT 0,

                    -- Video tracking
                    video_progress_percent DECIMAL(5,2) DEFAULT 0,
                    video_last_position_seconds INT DEFAULT 0,
                    video_requirement_met BIT DEFAULT 0,

                    -- Quiz tracking
                    quiz_score DECIMAL(5,2) NULL,
                    quiz_attempts INT DEFAULT 0,
                    quiz_passed BIT DEFAULT 0,
                    quiz_required BIT DEFAULT 0,

                    -- Overall completion
                    is_completed BIT DEFAULT 0,
                    completed_at DATETIME2 NULL,

                    -- Timestamps
                    first_accessed_at DATETIME2 DEFAULT GETDATE(),
                    last_accessed_at DATETIME2 DEFAULT GETDATE(),

                    -- Constraints
                    CONSTRAINT FK_lesson_progress_user FOREIGN KEY (user_id) REFERENCES users(user_id),
                    CONSTRAINT FK_lesson_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id),
                    CONSTRAINT FK_lesson_progress_course FOREIGN KEY (course_id) REFERENCES courses(course_id),
                    CONSTRAINT UQ_user_lesson UNIQUE (user_id, lesson_id)
                )
            `);
            console.log('lesson_progress table created');

            // Create indexes for performance
            await pool.request().query(`
                CREATE INDEX IX_lesson_progress_user ON lesson_progress(user_id);
                CREATE INDEX IX_lesson_progress_lesson ON lesson_progress(lesson_id);
                CREATE INDEX IX_lesson_progress_course ON lesson_progress(course_id);
            `);
            console.log('Indexes created');
        } else {
            console.log('lesson_progress table already exists');
        }

        // =========================================
        // 2. lesson_time_logs Table - บันทึก log เวลาเรียนละเอียด
        // =========================================
        console.log('\nStep 2: Creating lesson_time_logs table...');

        const checkTimeLogs = await pool.request().query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_NAME = 'lesson_time_logs'
        `);

        if (checkTimeLogs.recordset.length === 0) {
            await pool.request().query(`
                CREATE TABLE lesson_time_logs (
                    log_id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL,
                    lesson_id INT NOT NULL,
                    session_start DATETIME2 NOT NULL,
                    session_end DATETIME2 NULL,
                    duration_seconds INT DEFAULT 0,
                    activity_type NVARCHAR(50) DEFAULT 'viewing',
                    ip_address NVARCHAR(45) NULL,
                    user_agent NVARCHAR(500) NULL,
                    created_at DATETIME2 DEFAULT GETDATE(),

                    CONSTRAINT FK_time_logs_user FOREIGN KEY (user_id) REFERENCES users(user_id),
                    CONSTRAINT FK_time_logs_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id)
                )
            `);
            console.log('lesson_time_logs table created');

            await pool.request().query(`
                CREATE INDEX IX_time_logs_user_lesson ON lesson_time_logs(user_id, lesson_id);
                CREATE INDEX IX_time_logs_session ON lesson_time_logs(session_start);
            `);
            console.log('Indexes created');
        } else {
            console.log('lesson_time_logs table already exists');
        }

        // =========================================
        // 3. Update lessons table - เพิ่ม column สำหรับ requirement
        // =========================================
        console.log('\nStep 3: Adding completion requirements to lessons table...');

        const checkMinTime = await pool.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'lessons' AND COLUMN_NAME = 'min_time_seconds'
        `);

        if (checkMinTime.recordset.length === 0) {
            await pool.request().query(`
                ALTER TABLE lessons ADD
                    min_time_seconds INT DEFAULT 0,
                    min_video_percent INT DEFAULT 80,
                    quiz_passing_score INT DEFAULT 70,
                    require_time_tracking BIT DEFAULT 1,
                    require_video_completion BIT DEFAULT 1,
                    require_quiz_pass BIT DEFAULT 0
            `);
            console.log('Added completion requirement columns to lessons table');
        } else {
            console.log('Completion requirement columns already exist');
        }

        console.log('\nLesson Progress Tracking System created successfully!');
        return { success: true };

    } catch (error) {
        console.error('Error creating lesson progress tables:', error);
        return { success: false, error: error.message };
    }
}

// Run if called directly
if (require.main === module) {
    createLessonProgress()
        .then(result => {
            console.log('\nResult:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = createLessonProgress;
