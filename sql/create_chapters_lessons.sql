-- Create Chapters and Lessons tables for Course Structure
-- This creates a hierarchical structure: Course -> Chapters -> Lessons -> Tests

USE RC_LearnHub;
GO

-- =============================================
-- Create Chapters Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[chapters]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[chapters] (
        [chapter_id] INT IDENTITY(1,1) PRIMARY KEY,
        [course_id] INT NOT NULL,
        [title] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [order_index] INT NOT NULL DEFAULT 0,
        [duration_minutes] INT NULL,
        [is_published] BIT NOT NULL DEFAULT 0,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Foreign Keys
        CONSTRAINT FK_chapters_courses FOREIGN KEY (course_id)
            REFERENCES courses(course_id) ON DELETE CASCADE
    );

    PRINT '✅ Table [chapters] created successfully';
END
ELSE
BEGIN
    PRINT '⚠️ Table [chapters] already exists';
END
GO

-- Create index for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_chapters_course_id')
BEGIN
    CREATE INDEX IX_chapters_course_id ON chapters(course_id);
    PRINT '✅ Index IX_chapters_course_id created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_chapters_order')
BEGIN
    CREATE INDEX IX_chapters_order ON chapters(course_id, order_index);
    PRINT '✅ Index IX_chapters_order created';
END
GO

-- =============================================
-- Create Lessons Table
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[lessons]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[lessons] (
        [lesson_id] INT IDENTITY(1,1) PRIMARY KEY,
        [chapter_id] INT NOT NULL,
        [title] NVARCHAR(255) NOT NULL,
        [description] NVARCHAR(MAX) NULL,
        [content_type] NVARCHAR(50) NULL, -- 'video', 'text', 'quiz', 'assignment', 'document'
        [content] NVARCHAR(MAX) NULL,
        [video_url] NVARCHAR(500) NULL,
        [video_duration] INT NULL, -- in seconds
        [order_index] INT NOT NULL DEFAULT 0,
        [duration_minutes] INT NULL,
        [is_required] BIT NOT NULL DEFAULT 0,
        [is_preview] BIT NOT NULL DEFAULT 0, -- Allow preview without enrollment
        [is_published] BIT NOT NULL DEFAULT 0,
        [created_at] DATETIME2 NOT NULL DEFAULT GETDATE(),
        [updated_at] DATETIME2 NOT NULL DEFAULT GETDATE(),

        -- Foreign Keys
        CONSTRAINT FK_lessons_chapters FOREIGN KEY (chapter_id)
            REFERENCES chapters(chapter_id) ON DELETE CASCADE
    );

    PRINT '✅ Table [lessons] created successfully';
END
ELSE
BEGIN
    PRINT '⚠️ Table [lessons] already exists';
END
GO

-- Create indexes for performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_lessons_chapter_id')
BEGIN
    CREATE INDEX IX_lessons_chapter_id ON lessons(chapter_id);
    PRINT '✅ Index IX_lessons_chapter_id created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_lessons_order')
BEGIN
    CREATE INDEX IX_lessons_order ON lessons(chapter_id, order_index);
    PRINT '✅ Index IX_lessons_order created';
END
GO

-- =============================================
-- Add Foreign Key Constraints to Tests Table
-- =============================================
IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_tests_chapters' AND parent_object_id = OBJECT_ID('tests')
)
BEGIN
    ALTER TABLE tests
    ADD CONSTRAINT FK_tests_chapters FOREIGN KEY (chapter_id)
        REFERENCES chapters(chapter_id) ON DELETE NO ACTION;
    PRINT '✅ Foreign key FK_tests_chapters created';
END
ELSE
BEGIN
    PRINT '⚠️ Foreign key FK_tests_chapters already exists';
END
GO

IF NOT EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_tests_lessons' AND parent_object_id = OBJECT_ID('tests')
)
BEGIN
    ALTER TABLE tests
    ADD CONSTRAINT FK_tests_lessons FOREIGN KEY (lesson_id)
        REFERENCES lessons(lesson_id) ON DELETE NO ACTION;
    PRINT '✅ Foreign key FK_tests_lessons created';
END
ELSE
BEGIN
    PRINT '⚠️ Foreign key FK_tests_lessons already exists';
END
GO

-- =============================================
-- Insert Sample Data for Testing
-- =============================================
PRINT '';
PRINT '📝 Inserting sample data...';

-- Check if we have any courses
DECLARE @courseCount INT;
SELECT @courseCount = COUNT(*) FROM courses;

IF @courseCount > 0
BEGIN
    DECLARE @sampleCourseId INT;
    SELECT TOP 1 @sampleCourseId = course_id FROM courses ORDER BY course_id;

    -- Insert sample chapters only if none exist
    IF NOT EXISTS (SELECT * FROM chapters WHERE course_id = @sampleCourseId)
    BEGIN
        INSERT INTO chapters (course_id, title, description, order_index, duration_minutes, is_published)
        VALUES
            (@sampleCourseId, N'บทที่ 1: เริ่มต้นใช้งาน', N'เรียนรู้พื้นฐานและการเริ่มต้นใช้งาน', 1, 60, 1),
            (@sampleCourseId, N'บทที่ 2: แนวคิดหลัก', N'ทำความเข้าใจแนวคิดและหลักการสำคัญ', 2, 90, 1),
            (@sampleCourseId, N'บทที่ 3: การปฏิบัติจริง', N'ฝึกปฏิบัติและทำโปรเจค', 3, 120, 1);

        PRINT '✅ Sample chapters inserted';

        -- Insert sample lessons for first chapter
        DECLARE @chapterId INT;
        SELECT TOP 1 @chapterId = chapter_id FROM chapters WHERE course_id = @sampleCourseId ORDER BY order_index;

        IF @chapterId IS NOT NULL
        BEGIN
            INSERT INTO lessons (chapter_id, title, description, content_type, order_index, duration_minutes, is_required, is_published)
            VALUES
                (@chapterId, N'บทเรียนที่ 1.1: แนะนำ', N'ทำความรู้จักกับหลักสูตร', 'video', 1, 15, 1, 1),
                (@chapterId, N'บทเรียนที่ 1.2: การติดตั้ง', N'วิธีการติดตั้งและเตรียมสภาพแวดล้อม', 'video', 2, 20, 1, 1),
                (@chapterId, N'บทเรียนที่ 1.3: แบบทดสอบ', N'ทดสอบความเข้าใจบทที่ 1', 'quiz', 3, 25, 1, 1);

            PRINT '✅ Sample lessons inserted';
        END
    END
    ELSE
    BEGIN
        PRINT '⚠️ Sample chapters already exist, skipping insert';
    END
END
ELSE
BEGIN
    PRINT '⚠️ No courses found, skipping sample data insert';
END
GO

PRINT '';
PRINT '✅ Migration completed successfully!';
PRINT '';
PRINT '📊 Summary:';
PRINT '  - Chapters table: Created/Verified';
PRINT '  - Lessons table: Created/Verified';
PRINT '  - Foreign keys: Created/Verified';
PRINT '  - Indexes: Created for performance';
PRINT '  - Sample data: Inserted if needed';
GO
