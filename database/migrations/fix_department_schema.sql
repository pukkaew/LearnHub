-- Migration: Fix Department Schema
-- Date: 2025-10-18
-- Description: Remove manager_id column from Departments table as it doesn't exist in the schema

-- This migration is a documentation of the schema fix
-- The Department model was referencing manager_id column that doesn't exist
-- We need to remove all references to manager_id from the model

-- No actual SQL changes needed - the table is already correct
-- The Department table schema:
-- department_id (PK)
-- department_name
-- department_code
-- description
-- is_active
-- created_at
-- updated_at

SELECT 'Department schema is already correct. Model will be updated to match.' AS message;
