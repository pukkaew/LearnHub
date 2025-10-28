-- Migration: Add organization fields to Users table
-- Date: 2025-10-28
-- Description: Add branch_id, office_id, division_id to Users table for organizational hierarchy

USE LearnHub;
GO

-- Add new columns to Users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[users]') AND name = 'branch_id')
BEGIN
    ALTER TABLE [users]
    ADD [branch_id] INT NULL;
    PRINT 'Added branch_id column to Users table';
END
ELSE
BEGIN
    PRINT 'branch_id column already exists in Users table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[users]') AND name = 'office_id')
BEGIN
    ALTER TABLE [users]
    ADD [office_id] INT NULL;
    PRINT 'Added office_id column to Users table';
END
ELSE
BEGIN
    PRINT 'office_id column already exists in Users table';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[users]') AND name = 'division_id')
BEGIN
    ALTER TABLE [users]
    ADD [division_id] INT NULL;
    PRINT 'Added division_id column to Users table';
END
ELSE
BEGIN
    PRINT 'division_id column already exists in Users table';
END
GO

-- Add foreign key constraints to OrganizationUnits table (if it exists)
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'OrganizationUnits')
BEGIN
    -- Add FK for branch_id
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Branch')
    BEGIN
        ALTER TABLE [users]
        ADD CONSTRAINT FK_Users_Branch
        FOREIGN KEY ([branch_id]) REFERENCES [OrganizationUnits]([unit_id]);
        PRINT 'Added FK constraint for branch_id';
    END

    -- Add FK for office_id
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Office')
    BEGIN
        ALTER TABLE [users]
        ADD CONSTRAINT FK_Users_Office
        FOREIGN KEY ([office_id]) REFERENCES [OrganizationUnits]([unit_id]);
        PRINT 'Added FK constraint for office_id';
    END

    -- Add FK for division_id
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Users_Division')
    BEGIN
        ALTER TABLE [users]
        ADD CONSTRAINT FK_Users_Division
        FOREIGN KEY ([division_id]) REFERENCES [OrganizationUnits]([unit_id]);
        PRINT 'Added FK constraint for division_id';
    END
END
GO

PRINT 'Migration completed successfully!';
PRINT 'Users table now has branch_id, office_id, and division_id columns.';
GO
