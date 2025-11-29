-- Remove test_id from courses table
-- This fixes the incorrect 1:1 relationship between Course and Test
-- Correct relationship: Course 1:N Tests (via tests.course_id)

USE RC_LearnHub;
GO

-- Drop foreign key constraint if exists
IF EXISTS (
    SELECT * FROM sys.foreign_keys
    WHERE name = 'FK_courses_tests' AND parent_object_id = OBJECT_ID('courses')
)
BEGIN
    ALTER TABLE courses DROP CONSTRAINT FK_courses_tests;
    PRINT '✅ Dropped FK_courses_tests constraint';
END
GO

-- Drop the test_id column
IF EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('courses') AND name = 'test_id'
)
BEGIN
    ALTER TABLE courses DROP COLUMN test_id;
    PRINT '✅ Dropped test_id column from courses table';
END
ELSE
BEGIN
    PRINT '⚠️  test_id column does not exist in courses table';
END
GO

PRINT '';
PRINT '✅ Migration completed successfully!';
PRINT '   Courses table now uses correct 1:N relationship via tests.course_id';
GO
