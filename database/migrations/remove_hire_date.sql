-- Migration: Remove hire_date column from Users table
-- Date: 2025-10-17
-- Description: Removes the hire_date column as it is no longer used in the system

USE LearnHub;
GO

-- Check if the column exists before dropping it
IF EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users'
    AND COLUMN_NAME = 'hire_date'
)
BEGIN
    PRINT 'Dropping hire_date column from Users table...';
    ALTER TABLE Users DROP COLUMN hire_date;
    PRINT 'hire_date column has been successfully removed.';
END
ELSE
BEGIN
    PRINT 'hire_date column does not exist in Users table.';
END
GO
