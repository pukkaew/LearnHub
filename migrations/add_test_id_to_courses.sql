-- Add test_id column to Courses table
-- This allows linking courses to their assessment tests

USE LearnHub;
GO

-- Check if column already exists
IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Courses'
    AND COLUMN_NAME = 'test_id'
)
BEGIN
    ALTER TABLE Courses
    ADD test_id INT NULL;

    PRINT '✅ Column test_id added to Courses table';
END
ELSE
BEGIN
    PRINT '⚠️ Column test_id already exists in Courses table';
END
GO

-- Add foreign key constraint if Tests table exists
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Tests')
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE
        WHERE CONSTRAINT_NAME = 'FK_Courses_Tests'
    )
    BEGIN
        ALTER TABLE Courses
        ADD CONSTRAINT FK_Courses_Tests
        FOREIGN KEY (test_id) REFERENCES Tests(test_id)
        ON DELETE SET NULL;

        PRINT '✅ Foreign key constraint FK_Courses_Tests created';
    END
    ELSE
    BEGIN
        PRINT '⚠️ Foreign key constraint FK_Courses_Tests already exists';
    END
END
GO

PRINT '✅ Migration completed successfully';
